import { resolve } from "node:path";

import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../apps/api/src/db/client";
import { classes, sessions, users } from "../apps/api/src/db/schema";
import { app } from "../apps/api/src/index";
import { newId } from "../apps/api/src/lib/ids";
import { hashPassword } from "../apps/api/src/lib/password";
import { hashToken, newSessionToken, SESSION_COOKIE } from "../apps/api/src/lib/session";
import { nowIso } from "../apps/api/src/lib/time";

const migrationsFolder = resolve(process.cwd(), "apps/api/src/db/migrations");
const teacherCreds = { username: "teacher", password: "teacher-pass-1" };
let teacherToken = "";
let studentToken = "";
let revokeToken = "";
let classId = "";
let studentId = "";

function cookie(token: string): Record<string, string> {
  return { cookie: `${SESSION_COOKIE}=${token}` };
}

async function request(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
  token?: string,
) {
  return app.request(path, {
    ...init,
    headers: { ...init.headers, ...(token ? cookie(token) : {}) },
  });
}

async function createSession(
  userId: string,
  token: string,
  expiresAt = "2999-01-01T00:00:00.000Z",
) {
  await db.insert(sessions).values({
    id: newId(),
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    createdAt: nowIso(),
    lastUsedAt: nowIso(),
  });
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
  const teacherHash = await hashPassword(teacherCreds.password);
  const studentHash = await hashPassword("student-pass-1");
  await db.insert(users).values([
    {
      id: newId(),
      username: teacherCreds.username,
      displayName: "Teacher",
      role: "teacher",
      passwordHash: teacherHash,
      createdAt: nowIso(),
    },
    {
      id: newId(),
      username: "student",
      displayName: "Student",
      role: "student",
      passwordHash: studentHash,
      createdAt: nowIso(),
    },
  ]);
  const teacher = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "teacher"))
    .get();
  const student = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "student"))
    .get();
  if (!teacher || !student) throw new Error("seed failed");
  // libSQL's RETURNING is unreliable here: generate ids up front.
  const revokeUserId = newId();
  await db.insert(users).values({
    id: revokeUserId,
    username: "student4",
    displayName: "Student Four",
    role: "student",
    passwordHash: studentHash,
    createdAt: nowIso(),
  });
  teacherToken = newSessionToken();
  studentToken = newSessionToken();
  revokeToken = newSessionToken();
  await createSession(teacher.id, teacherToken);
  await createSession(student.id, studentToken);
  await createSession(revokeUserId, revokeToken);

  classId = newId();
  await db.insert(classes).values({ id: classId, name: "2AS-1", position: 1, createdAt: nowIso() });
  studentId = newId();
  await db.insert(users).values({
    id: studentId,
    username: "student2",
    displayName: "Student Two",
    role: "student",
    passwordHash: studentHash,
    classId,
    createdAt: nowIso(),
  });
});

describe("auth", () => {
  it("logs in a teacher with a session cookie", async () => {
    const response = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.1.0.1" },
      body: JSON.stringify(teacherCreds),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ role: "teacher", username: "teacher" });
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
  });

  it("rejects bad credentials and respects per-username lockout without blocking other users", async () => {
    const headers = { "content-type": "application/json", "x-forwarded-for": "10.1.0.2" };
    for (let i = 0; i < 5; i += 1) {
      const response = await request("/api/auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify({ username: "nobody", password: "wrong-pass" }),
      });
      expect(response.status).toBe(401);
    }
    const locked = await request("/api/auth/login", {
      method: "POST",
      headers,
      body: JSON.stringify({ username: "nobody", password: "wrong-pass" }),
    });
    expect(locked.status).toBe(429);
    const other = await request("/api/auth/login", {
      method: "POST",
      headers,
      body: JSON.stringify(teacherCreds),
    });
    expect(other.status).toBe(200);
  });

  it("rejects invalid origins on mutations", async () => {
    const response = await request(
      "/api/teacher/classes",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://evil.example" },
        body: JSON.stringify({ name: "Nope" }),
      },
      teacherToken,
    );
    expect(response.status).toBe(403);
  });

  it("serves /me only to authenticated sessions", async () => {
    expect((await request("/api/auth/me")).status).toBe(401);
    const student = await request("/api/auth/me", {}, studentToken);
    expect(student.status).toBe(200);
    expect(await student.json()).toMatchObject({ role: "student" });
  });

  it("revokes a session on password reset and on expiry", async () => {
    const target = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, "student4"))
      .get();
    if (!target) throw new Error("missing student4");
    const reset = await request(
      `/api/teacher/students/${target.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "a-new-password-1" }),
      },
      teacherToken,
    );
    expect(reset.status).toBe(200);
    expect((await request("/api/auth/me", {}, revokeToken)).status).toBe(401);

    const expiredToken = newSessionToken();
    const expiredUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, "student"))
      .get();
    if (!expiredUser) throw new Error("missing student");
    await createSession(expiredUser.id, expiredToken, "2000-01-01T00:00:00.000Z");
    expect((await request("/api/auth/me", {}, expiredToken)).status).toBe(401);
  });
});

describe("role matrix", () => {
  function cases(): Array<{ method: string; path: string; body?: unknown; teacherStatus: number }> {
    return [
      { method: "GET", path: "/api/teacher/classes", teacherStatus: 200 },
      { method: "GET", path: "/api/teacher/classes?archived=1", teacherStatus: 200 },
      { method: "POST", path: "/api/teacher/classes", body: { name: "3AS-2" }, teacherStatus: 201 },
      {
        method: "POST",
        path: "/api/teacher/classes/reorder",
        body: { ids: [] },
        teacherStatus: 422,
      },
      {
        method: "PATCH",
        path: "class-id",
        body: { name: "2AS-1 renamed" },
        teacherStatus: 200,
      },
      { method: "GET", path: "/api/teacher/students", teacherStatus: 200 },
      {
        method: "POST",
        path: "/api/teacher/students",
        body: { username: "student3", displayName: "Three", password: "password-3", classId },
        teacherStatus: 201,
      },
      {
        method: "PATCH",
        path: "student-id",
        body: { displayName: "Renamed" },
        teacherStatus: 200,
      },
    ];
  }

  it("returns 401 anonymous, 403 for students, and the expected teacher code on every route", async () => {
    for (const testCase of cases()) {
      const path = testCase.path === "class-id" ? `/api/teacher/classes/${classId}` : testCase.path;
      const resolvedPath =
        testCase.path === "student-id" ? `/api/teacher/students/${studentId}` : path;
      const init: RequestInit & { headers: Record<string, string> } = {
        method: testCase.method,
        headers: { "content-type": "application/json" },
      };
      if (testCase.body) init.body = JSON.stringify(testCase.body);

      expect(
        (await request(resolvedPath, init)).status,
        `${testCase.method} ${testCase.path} anon`,
      ).toBe(401);
      expect(
        (await request(resolvedPath, init, studentToken)).status,
        `${testCase.method} ${testCase.path} student`,
      ).toBe(403);
      expect(
        (await request(resolvedPath, init, teacherToken)).status,
        `${testCase.method} ${testCase.path} teacher`,
      ).toBe(testCase.teacherStatus);
    }
  });
});

describe("classes and students", () => {
  it("lists only active classes and students in their class roster", async () => {
    const created = await request(
      "/api/teacher/classes",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "ToArchive" }),
      },
      teacherToken,
    );
    const archived = (await created.json()) as { id: string };
    await request(
      `/api/teacher/classes/${archived.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: true }),
      },
      teacherToken,
    );
    const classesResponse = await request("/api/teacher/classes", {}, teacherToken);
    const activeClasses = (await classesResponse.json()) as Array<{ name: string }>;
    expect(activeClasses.map((item) => item.name)).not.toContain("ToArchive");

    const withArchived = await request("/api/teacher/classes?archived=1", {}, teacherToken);
    const allClasses = (await withArchived.json()) as Array<{ name: string }>;
    expect(allClasses.map((item) => item.name)).toContain("ToArchive");

    const roster = await request(`/api/teacher/students?classId=${classId}`, {}, teacherToken);
    const students = (await roster.json()) as Array<{ username: string }>;
    expect(students.map((item) => item.username)).toContain("student2");
  });

  it("enforces unique names, positive positions, and a complete reorder", async () => {
    const active = await request("/api/teacher/classes", {}, teacherToken);
    const activeRows = (await active.json()) as Array<{ id: string; name: string }>;
    const existing = activeRows[0];
    if (!existing) throw new Error("missing active class");

    const headers = { "content-type": "application/json" };
    const duplicate = await request(
      "/api/teacher/classes",
      { method: "POST", headers, body: JSON.stringify({ name: existing.name.toUpperCase() }) },
      teacherToken,
    );
    expect(duplicate.status).toBe(409);

    const badPosition = await request(
      "/api/teacher/classes",
      { method: "POST", headers, body: JSON.stringify({ name: "ZeroPos", position: 0 }) },
      teacherToken,
    );
    expect(badPosition.status).toBe(422);

    const badArchive = await request(
      `/api/teacher/classes/${existing.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ archived: false }) },
      teacherToken,
    );
    expect(badArchive.status).toBe(422);

    const ids = activeRows.map((row) => row.id).reverse();
    const reordered = await request(
      "/api/teacher/classes/reorder",
      { method: "POST", headers, body: JSON.stringify({ ids }) },
      teacherToken,
    );
    expect(reordered.status).toBe(200);
    const rows = (await reordered.json()) as Array<{ id: string; position: number }>;
    expect(rows.map((row) => row.id)).toEqual(ids);
    expect(rows.map((row) => row.position)).toEqual(ids.map((_id, index) => index + 1));

    const stale = await request(
      "/api/teacher/classes/reorder",
      { method: "POST", headers, body: JSON.stringify({ ids: [existing.id] }) },
      teacherToken,
    );
    expect(stale.status).toBe(409);
  });

  it("prevents archived users from logging in", async () => {
    await request(
      `/api/teacher/students/${studentId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: true }),
      },
      teacherToken,
    );
    const response = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.1.0.3" },
      body: JSON.stringify({ username: "student2", password: "student-pass-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("clears the cookie on logout and invalidates the session", async () => {
    const response = await request("/api/auth/logout", { method: "POST" }, teacherToken);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie") ?? "").toContain("jaweb_session=;");
    const session = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.tokenHash, hashToken(teacherToken))))
      .get();
    expect(session).toBeUndefined();
  });
});
