import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";

import type {
  Client,
  InArgs,
  InStatement,
  Replicated,
  ResultSet,
  Row,
  Transaction,
  TransactionMode,
  Value,
} from "@libsql/client";
import initSqlJs, { type Database, type SqlValue } from "sql.js";

// `file:` URLs normally use @libsql/client's native binding, which has no
// Android/Termux build. This sql.js-backed adapter speaks the same Client
// interface that drizzle-orm/libsql expects, so local dev and tests can run
// anywhere WASM runs while production keeps using the native/Turso client.

const require = createRequire(import.meta.url);
const SQL = await initSqlJs({ locateFile: () => require.resolve("sql.js/dist/sql-wasm.wasm") });

const WRITE_PREFIXES = [
  "CREATE",
  "DROP",
  "ALTER",
  "INSERT",
  "UPDATE",
  "DELETE",
  "REPLACE",
  "VACUUM",
];

type SqlArg = SqlValue;

function toSqlValue(value: unknown): SqlArg {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof value === "string" || typeof value === "number" || value instanceof Uint8Array)
    return value;
  throw new Error("Unsupported SQL argument type");
}

function bindArgs(args: InArgs | undefined): SqlArg[] {
  if (args === undefined) return [];
  if (Array.isArray(args)) return args.map(toSqlValue);
  return Object.values(args).map(toSqlValue);
}

function makeRow(columns: string[], values: SqlValue[]): Row {
  const row = {} as Row;
  // Match @libsql/client rows: numeric indices non-enumerable, named columns
  // enumerable. Drizzle relies on both views of the same row.
  Object.defineProperty(row, "length", { value: values.length });
  values.forEach((value, index) => {
    Object.defineProperty(row, index, { value: value as Value });
    const column = columns[index];
    if (column !== undefined && !Object.hasOwn(row, column)) {
      Object.defineProperty(row, column, {
        value: value as Value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  });
  return row;
}

class LocalResultSet implements ResultSet {
  readonly columns: string[];
  readonly columnTypes: string[];
  readonly rows: Row[];
  readonly rowsAffected: number;
  readonly lastInsertRowid: bigint | undefined;

  constructor(
    columns: string[],
    rows: Row[],
    rowsAffected: number,
    lastInsertRowid: bigint | undefined,
  ) {
    this.columns = columns;
    this.columnTypes = columns.map(() => "");
    this.rows = rows;
    this.rowsAffected = rowsAffected;
    this.lastInsertRowid = lastInsertRowid;
  }

  toJSON(): Record<string, unknown> {
    return {
      columns: this.columns,
      columnTypes: this.columnTypes,
      rows: this.rows.map((row) => Array.from({ length: row.length }, (_, index) => row[index])),
      rowsAffected: this.rowsAffected,
      lastInsertRowid: this.lastInsertRowid === undefined ? null : String(this.lastInsertRowid),
    };
  }
}

function lastInsertRowid(db: Database): bigint {
  const result = db.exec("SELECT last_insert_rowid()")[0];
  const value = result?.values[0]?.[0];
  return BigInt(typeof value === "string" || typeof value === "number" ? value : 0);
}

export async function createLocalClient(url: string): Promise<Client> {
  const path = url.slice("file:".length);
  const inMemory = path === ":memory:";
  const file = inMemory ? undefined : path.startsWith("/") ? path : `/${path}`;

  const db = new SQL.Database(
    file !== undefined && existsSync(file) ? new Uint8Array(readFileSync(file)) : undefined,
  );
  let dirty = false;
  let closed = false;

  function flush(): void {
    if (file === undefined || !dirty) return;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(db.export()));
    dirty = false;
  }

  function executeStatement(stmt: InStatement): ResultSet {
    const { sql, args } = typeof stmt === "string" ? { sql: stmt, args: undefined } : stmt;
    const prepared = db.prepare(sql);
    try {
      const values = bindArgs(args);
      if (values.length > 0) prepared.bind(values);
      const columns = prepared.getColumnNames();
      const rows: Row[] = [];
      while (prepared.step()) {
        rows.push(makeRow(columns, prepared.get()));
      }
      if (columns.length > 0) return new LocalResultSet(columns, rows, 0, undefined);

      const keyword = sql.trimStart().split(/\s/, 1)[0]?.toUpperCase() ?? "";
      if (WRITE_PREFIXES.includes(keyword)) dirty = true;
      return new LocalResultSet([], [], db.getRowsModified(), lastInsertRowid(db));
    } finally {
      prepared.free();
    }
  }

  function runTransaction(stmts: InStatement[], mode: TransactionMode): ResultSet[] {
    db.run(mode === "write" ? "BEGIN IMMEDIATE" : mode === "read" ? "BEGIN" : "BEGIN DEFERRED");
    try {
      const results = stmts.map(executeStatement);
      db.run("COMMIT");
      return results;
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }
  }

  const client: Client = {
    protocol: "file",
    get closed() {
      return closed;
    },

    async execute(stmtOrSql: InStatement, args?: InArgs): Promise<ResultSet> {
      const result = executeStatement(
        typeof stmtOrSql === "string" && args !== undefined ? { sql: stmtOrSql, args } : stmtOrSql,
      );
      flush();
      return result;
    },

    async batch(
      stmts: Array<InStatement | [string, InArgs?]>,
      mode: TransactionMode = "deferred",
    ): Promise<ResultSet[]> {
      const normalized = stmts.map((stmt) =>
        Array.isArray(stmt) ? { sql: stmt[0], args: stmt[1] } : stmt,
      );
      const results = runTransaction(normalized, mode);
      flush();
      return results;
    },

    async migrate(stmts: InStatement[]): Promise<ResultSet[]> {
      db.run("PRAGMA foreign_keys=OFF");
      try {
        const results = runTransaction(stmts, "deferred");
        flush();
        return results;
      } finally {
        db.run("PRAGMA foreign_keys=ON");
      }
    },

    async executeMultiple(sql: string): Promise<void> {
      db.run(sql);
      dirty = true;
      flush();
    },

    async transaction(mode: TransactionMode = "deferred"): Promise<Transaction> {
      db.run(mode === "write" ? "BEGIN IMMEDIATE" : mode === "read" ? "BEGIN" : "BEGIN DEFERRED");
      let finished = false;
      return {
        execute: async (stmt) => executeStatement(stmt),
        batch: async (stmts) => stmts.map(executeStatement),
        executeMultiple: async (sql) => {
          db.run(sql);
          dirty = true;
        },
        commit: async () => {
          db.run("COMMIT");
          finished = true;
          flush();
        },
        rollback: async () => {
          db.run("ROLLBACK");
          finished = true;
        },
        close: () => {
          if (!finished) db.run("ROLLBACK");
          finished = true;
        },
        get closed() {
          return finished;
        },
      } as Transaction;
    },

    close(): void {
      flush();
      db.close();
      closed = true;
    },

    reconnect(): void {
      throw new Error("reconnect() is not supported by the local sql.js client");
    },

    async sync(): Promise<Replicated> {
      throw new Error("sync() is not supported by the local sql.js client");
    },
  };

  return client;
}
