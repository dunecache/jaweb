import { type ClassDto, classSchema, type PatchStudentRequest, studentSchema } from "@jaweb/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { EditStudentDialog } from "@/components/app/edit-student-dialog";
import { ResetPasswordDialog } from "@/components/app/reset-password-dialog";
import {
  type AddResult,
  StudentBulkForm,
  type StudentDraft,
} from "@/components/app/student-bulk-form";
import { useToast } from "@/components/app/toaster";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiRequest } from "@/lib/api";

const studentsQueryKey = ["teacher", "students"] as const;
const classesQueryKey = ["teacher", "classes"] as const;
const studentListSchema = z.array(studentSchema);
const classListSchema = z.array(classSchema);

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.envelope.error.message : fallback;
}

export function StudentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const students = useQuery({
    queryKey: studentsQueryKey,
    queryFn: () => apiRequest("/teacher/students", undefined, studentListSchema),
  });
  const classes = useQuery({
    queryKey: classesQueryKey,
    queryFn: () => apiRequest("/teacher/classes", undefined, classListSchema),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: studentsQueryKey });

  const createMany = useMutation({
    mutationFn: async (drafts: StudentDraft[]): Promise<AddResult[]> => {
      const settled = await Promise.allSettled(
        drafts.map((draft) =>
          apiRequest(
            "/teacher/students",
            {
              method: "POST",
              body: JSON.stringify({
                username: draft.username,
                displayName: draft.displayName,
                password: draft.password,
                classId: draft.classId,
              }),
            },
            studentSchema,
          ),
        ),
      );
      return drafts.map((draft, index) => {
        const result = settled[index];
        return {
          id: draft.id,
          error:
            result?.status === "rejected"
              ? messageOf(result.reason, "Could not add this student.")
              : undefined,
        };
      });
    },
    onSuccess: (results) => {
      invalidate();
      const failed = results.filter((result) => result.error).length;
      const ok = results.length - failed;
      toast(
        failed
          ? `${ok} added, ${failed} failed — retry the highlighted rows.`
          : `Added ${ok} student${ok === 1 ? "" : "s"}.`,
      );
    },
  });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchStudentRequest }) =>
      apiRequest(`/teacher/students/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_result, variables) => {
      invalidate();
      if (variables.body.archived) toast("Student archived.");
      else if (variables.body.password) toast("Password updated.");
      else toast("Student updated.");
    },
    onError: (error) => toast(messageOf(error, "Could not update the student.")),
  });

  const classOptions: ClassDto[] = classes.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Students</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create accounts, assign classes, edit details, reset passwords.
        </p>
      </div>

      <StudentBulkForm
        classes={classOptions}
        isPending={createMany.isPending}
        onAdd={(drafts) => createMany.mutateAsync(drafts)}
      />

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
                <TableCell className="text-muted-foreground">
                  {classOptions.find((item) => item.id === student.classId)?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <EditStudentDialog
                      student={student}
                      classes={classOptions}
                      onSave={(body) => patch.mutate({ id: student.id, body })}
                    />
                    <ResetPasswordDialog
                      onReset={(password) => patch.mutate({ id: student.id, body: { password } })}
                    />
                    <ConfirmButton
                      label="Archive"
                      title="Archive this student?"
                      description="They can no longer log in. Their history is kept."
                      confirmLabel="Archive"
                      destructive
                      onConfirm={() => patch.mutate({ id: student.id, body: { archived: true } })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
