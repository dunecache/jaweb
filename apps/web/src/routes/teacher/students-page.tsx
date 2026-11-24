import { type ClassDto, classSchema, studentSchema } from "@jaweb/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { z } from "zod";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { ResetPasswordDialog } from "@/components/app/reset-password-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/api";

const studentsQueryKey = ["teacher", "students"] as const;
const classesQueryKey = ["teacher", "classes"] as const;
const studentListSchema = z.array(studentSchema);
const classListSchema = z.array(classSchema);

export function StudentsPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [classId, setClassId] = useState("");

  const students = useQuery({
    queryKey: studentsQueryKey,
    queryFn: () => apiRequest("/teacher/students", undefined, studentListSchema),
  });
  const classes = useQuery({
    queryKey: classesQueryKey,
    queryFn: () => apiRequest("/teacher/classes", undefined, classListSchema),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: studentsQueryKey });
  const create = useMutation({
    mutationFn: (body: string) =>
      apiRequest("/teacher/students", { method: "POST", body }, studentSchema),
    onSuccess: invalidate,
  });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      apiRequest(`/teacher/students/${id}`, { method: "PATCH", body }),
    onSuccess: invalidate,
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      JSON.stringify({
        username,
        displayName,
        password,
        classId: classId || null,
      }),
    );
    setUsername("");
    setDisplayName("");
    setPassword("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Students</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Create accounts, assign a class, reset passwords.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-username">Username</Label>
          <Input
            id="student-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-name">Display name</Label>
          <Input
            id="student-name"
            dir="auto"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-password">Initial password</Label>
          <Input
            id="student-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-class">Class</Label>
          <select
            id="student-class"
            className="h-9 rounded-input border border-hairline bg-surface px-3 text-sm"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
          >
            <option value="">No class</option>
            {classes.data?.map((item: ClassDto) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={create.isPending} className="sm:col-span-2 lg:col-span-4">
          Add student
        </Button>
      </form>

      {students.isPending ? <LoadingState label="Loading students" /> : null}
      {students.isError ? (
        <ErrorState message="Could not load students." onRetry={() => void students.refetch()} />
      ) : null}
      {!students.isPending && !students.isError && !students.data?.length ? (
        <EmptyState message="No students yet. Add one above." />
      ) : null}
      {students.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Display name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.data.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-mono text-xs">{student.username}</TableCell>
                <TableCell>{student.displayName}</TableCell>
                <TableCell className="text-ink-muted">
                  {classes.data?.find((item) => item.id === student.classId)?.name ?? "—"}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <ResetPasswordDialog
                    onReset={(password) =>
                      patch.mutate({
                        id: student.id,
                        body: JSON.stringify({ password }),
                      })
                    }
                  />
                  <ConfirmButton
                    label="Archive"
                    title="Archive this student?"
                    description="They can no longer log in. Their history is kept."
                    confirmLabel="Archive"
                    destructive
                    onConfirm={() =>
                      patch.mutate({ id: student.id, body: JSON.stringify({ archived: true }) })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
