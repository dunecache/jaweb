import type { ClassDto } from "@jaweb/shared";
import { type FormEvent, useState } from "react";

import { PasswordInput } from "@/components/app/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type StudentDraft = {
  id: string;
  username: string;
  displayName: string;
  password: string;
  classId: string | null;
};

export type AddResult = { id: string; error?: string };

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(id: string, field: keyof StudentDraft, value: string | null) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    setErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const results = await onAdd(rows);
    const retryIds = new Set(results.filter((result) => result.error).map((result) => result.id));
    setRows((current) => {
      const remaining = current.filter((row) => retryIds.has(row.id));
      return remaining.length ? remaining : [newRow()];
    });
    const nextErrors: Record<string, string> = {};
    for (const result of results) {
      if (result.error) nextErrors[result.id] = result.error;
    }
    setErrors(nextErrors);
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {rows.map((row, index) => (
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
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`display-name-${row.id}`}>Display name</Label>
              <Input
                id={`display-name-${row.id}`}
                dir="auto"
                value={row.displayName}
                onChange={(event) => update(row.id, "displayName", event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`password-${row.id}`}>Initial password</Label>
              <PasswordInput
                id={`password-${row.id}`}
                minLength={8}
                value={row.password}
                onChange={(event) => update(row.id, "password", event.target.value)}
                required
              />
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
          {errors[row.id] ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {errors[row.id]}
            </p>
          ) : null}
        </div>
      ))}
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
