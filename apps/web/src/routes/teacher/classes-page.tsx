import { classSchema, type PatchClassRequest, studentSchema } from "@jaweb/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";
import { z } from "zod";

import { ArchivedClassesTable, ClassesTable } from "@/components/app/classes-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { useToast } from "@/components/app/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/api";

const classesQueryKey = ["teacher", "classes"] as const;
const archivedClassesQueryKey = ["teacher", "classes", { archived: true }] as const;
const studentsQueryKey = ["teacher", "students"] as const;
const classListSchema = z.array(classSchema);
const studentListSchema = z.array(studentSchema);

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.envelope.error.message : fallback;
}

export function ClassesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const classes = useQuery({
    queryKey: classesQueryKey,
    queryFn: () => apiRequest("/teacher/classes", undefined, classListSchema),
  });
  const archived = useQuery({
    queryKey: archivedClassesQueryKey,
    queryFn: () => apiRequest("/teacher/classes?archived=1", undefined, classListSchema),
    enabled: showArchived,
  });
  const students = useQuery({
    queryKey: studentsQueryKey,
    queryFn: () => apiRequest("/teacher/students", undefined, studentListSchema),
  });
  const counts = new Map<string, number>();
  for (const student of students.data ?? []) {
    if (student.classId) counts.set(student.classId, (counts.get(student.classId) ?? 0) + 1);
  }

  // The archived query sits under this key prefix, so one invalidation refreshes both lists.
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: classesQueryKey });
  const patchClass = (id: string, body: PatchClassRequest) =>
    apiRequest(`/teacher/classes/${id}`, { method: "PATCH", body: JSON.stringify(body) });

  const create = useMutation({
    mutationFn: (value: string) =>
      apiRequest(
        "/teacher/classes",
        { method: "POST", body: JSON.stringify({ name: value }) },
        classSchema,
      ),
    onSuccess: () => {
      invalidate();
      setName("");
      toast("Class added.");
    },
    onError: (error) => toast(messageOf(error, "Could not add the class.")),
  });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchClassRequest }) => patchClass(id, body),
    onSuccess: (_result, variables) => {
      invalidate();
      if (variables.body.name) toast("Class renamed.");
      else if (variables.body.archived) toast("Class archived.");
    },
    onError: (error) => toast(messageOf(error, "Could not update the class.")),
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      apiRequest(
        "/teacher/classes/reorder",
        { method: "POST", body: JSON.stringify({ ids }) },
        classListSchema,
      ),
    onSuccess: () => {
      invalidate();
      toast("Order updated.");
    },
    onError: (error) => toast(messageOf(error, "Could not reorder the classes.")),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (value) create.mutate(value);
  }

  const items = classes.data ?? [];
  const archivedItems = (archived.data ?? []).filter((item) => item.archivedAt);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Classes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Classes scope liveness, rosters, and boards.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="class-name">New class</Label>
          <Input
            id="class-name"
            ref={nameInput}
            dir="auto"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="2AS-1"
            required
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          Add class
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowArchived((current) => !current)}
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
      </form>

      {classes.isPending ? <LoadingState label="Loading classes" /> : null}
      {classes.isError ? (
        <ErrorState message="Could not load classes." onRetry={() => void classes.refetch()} />
      ) : null}
      {!classes.isPending && !classes.isError && !items.length ? (
        <EmptyState
          message="No classes yet. Add one to get started."
          action={
            <Button variant="outline" size="sm" onClick={() => nameInput.current?.focus()}>
              Add a class
            </Button>
          }
        />
      ) : null}
      {items.length ? (
        <ClassesTable
          items={items}
          counts={counts}
          showCounts={!students.isError}
          reorderPending={reorder.isPending}
          onReorder={(ids) => reorder.mutate(ids)}
          onRename={(id, value) => patch.mutate({ id, body: { name: value } })}
          onArchive={(id) => patch.mutate({ id, body: { archived: true } })}
        />
      ) : null}

      {showArchived && archived.isPending ? (
        <LoadingState label="Loading archived classes" />
      ) : null}
      {showArchived && archived.isError ? (
        <ErrorState
          message="Could not load archived classes."
          onRetry={() => void archived.refetch()}
        />
      ) : null}
      {showArchived ? <ArchivedClassesTable items={archivedItems} /> : null}
    </div>
  );
}
