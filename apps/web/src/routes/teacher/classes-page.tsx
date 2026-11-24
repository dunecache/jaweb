import { type ClassDto, classSchema } from "@jaweb/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { z } from "zod";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
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

const classesQueryKey = ["teacher", "classes"] as const;
const classListSchema = z.array(classSchema);

export function ClassesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const classes = useQuery({
    queryKey: classesQueryKey,
    queryFn: () => apiRequest("/teacher/classes", undefined, classListSchema),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: classesQueryKey });
  const create = useMutation({
    mutationFn: (newName: string) =>
      apiRequest(
        "/teacher/classes",
        { method: "POST", body: JSON.stringify({ name: newName }) },
        classSchema,
      ),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/teacher/classes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      }),
    onSuccess: invalidate,
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim());
    setName("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Classes</h1>
        <p className="mt-2 text-sm text-ink-muted">Classes scope liveness, rosters, and boards.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="class-name">New class</Label>
          <Input
            id="class-name"
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
      </form>

      {classes.isPending ? <LoadingState label="Loading classes" /> : null}
      {classes.isError ? (
        <ErrorState message="Could not load classes." onRetry={() => void classes.refetch()} />
      ) : null}
      {!classes.isPending && !classes.isError && !classes.data?.length ? (
        <EmptyState message="No classes yet. Add one to get started." />
      ) : null}
      {classes.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.data.map((item: ClassDto) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-ink-muted">{item.position}</TableCell>
                <TableCell className="text-right">
                  <ConfirmButton
                    label="Archive"
                    title="Archive this class?"
                    description="It will disappear from selection. Existing history is kept."
                    confirmLabel="Archive"
                    destructive
                    onConfirm={() => archive.mutate(item.id)}
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
