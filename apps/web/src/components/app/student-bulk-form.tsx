import { type ClassDto, createStudentRequestSchema } from "@jaweb/shared";
import { type FormEvent, useState } from "react";

import { PasswordInput } from "@/components/app/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FieldErrors, fieldErrors } from "@/lib/form-validation";

export type StudentDraft = {
  id: string;
  username: string;
  displayName: string;
  password: string;
  classId: string | null;
};

export type AddResult = { id: string; error?: string };

type RowErrors = FieldErrors & { _server?: string };

function newRow(): StudentDraft {
  return {
    id: crypto.randomUUID(),
    username: "",
    displayName: "",
    password: "",
    classId: null,
  };
}

export function StudentBulkForm({
  classes,
  isPending,
  onAdd,
}: {
  classes: ClassDto[];
  isPending: boolean;
  onAdd: (drafts: StudentDraft[]) => Promise<AddResult[]>;
}) {
  const [rows, setRows] = useState<StudentDraft[]>(() => [newRow()]);
  const [errors, setErrors] = useState<Record<string, RowErrors>>({});

  function update(id: string, field: keyof StudentDraft, value: string | null) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const messages = fieldErrors(createStudentRequestSchema, { ...row, [field]: value });
    setRows((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
    setErrors((current) => {
      const next = { ...current[id] };
      delete next._server;
      if (messages[field]) next[field] = messages[field] ?? "";
      else delete next[field];
      return { ...current, [id]: next };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const invalid: Record<string, RowErrors> = {};
    for (const row of rows) {
      const messages = fieldErrors(createStudentRequestSchema, row);
      if (Object.keys(messages).length > 0) invalid[row.id] = messages;
    }
    setErrors(invalid);
    if (Object.keys(invalid).length > 0) return;

    const results = await onAdd(rows);
    const retryIds = new Set(results.filter((result) => result.error).map((result) => result.id));
    setRows((current) => {
      const remaining = current.filter((row) => retryIds.has(row.id));
      return remaining.length ? remaining : [newRow()];
    });
    const serverErrors: Record<string, RowErrors> = {};
    for (const result of results) {
      if (result.error) serverErrors[result.id] = { _server: result.error };
    }
    setErrors(serverErrors);
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
      {rows.map((row, index) => {
        const rowErrors = errors[row.id] ?? {};
        const usernameError = rowErrors.username;
        const displayNameError = rowErrors.displayName;
        const passwordError = rowErrors.password;
        return (
          <div key={row.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Student {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={rows.length === 1 || isPending}
                onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
              >
                Remove
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`username-${row.id}`}>Username</Label>
                <Input
                  id={`username-${row.id}`}
                  value={row.username}
                  onChange={(event) => update(row.id, "username", event.target.value)}
                  aria-invalid={Boolean(usernameError)}
                  aria-describedby={
                    usernameError ? `username-${row.id}-error` : `username-${row.id}-hint`
                  }
                  autoComplete="off"
                />
                {usernameError ? (
                  <p
                    id={`username-${row.id}-error`}
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {usernameError}
                  </p>
                ) : (
                  <p id={`username-${row.id}-hint`} className="text-xs text-muted-foreground">
                    Lowercase letters, digits, . _ or -
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`display-name-${row.id}`}>Display name</Label>
                <Input
                  id={`display-name-${row.id}`}
                  dir="auto"
                  value={row.displayName}
                  onChange={(event) => update(row.id, "displayName", event.target.value)}
                  aria-invalid={Boolean(displayNameError)}
                  aria-describedby={displayNameError ? `display-name-${row.id}-error` : undefined}
                />
                {displayNameError ? (
                  <p
                    id={`display-name-${row.id}-error`}
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {displayNameError}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`password-${row.id}`}>Initial password</Label>
                <PasswordInput
                  id={`password-${row.id}`}
                  value={row.password}
                  onChange={(event) => update(row.id, "password", event.target.value)}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={
                    passwordError ? `password-${row.id}-error` : `password-${row.id}-hint`
                  }
                />
                {passwordError ? (
                  <p
                    id={`password-${row.id}-error`}
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {passwordError}
                  </p>
                ) : (
                  <p id={`password-${row.id}-hint`} className="text-xs text-muted-foreground">
                    At least 8 characters
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`class-${row.id}`}>Class</Label>
                <select
                  id={`class-${row.id}`}
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm"
                  value={row.classId ?? ""}
                  onChange={(event) => update(row.id, "classId", event.target.value || null)}
                >
                  <option value="">No class</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {rowErrors._server ? (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {rowErrors._server}
              </p>
            ) : null}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => setRows((current) => [...current, newRow()])}
        >
          Add another row
        </Button>
        <Button type="submit" disabled={isPending}>
          {rows.length === 1 ? "Add student" : `Add ${rows.length} students`}
        </Button>
      </div>
    </form>
  );
}
