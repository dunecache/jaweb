import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

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
import { modulesKey, useModules } from "@/lib/authoring";

export function ModulesPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const modules = useModules(showArchived);
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: modulesKey });

  const create = useMutation({
    mutationFn: (value: string) =>
      apiRequest(
        "/teacher/modules",
        { method: "POST", body: JSON.stringify({ title: value }) },
        undefined,
      ),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/teacher/modules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      }),
    onSuccess: invalidate,
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    create.mutate(title.trim());
    setTitle("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Modules</h1>
        <p className="mt-2 text-sm text-ink-muted">Ordered groups that exercises attach to.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="module-title">New module</Label>
          <Input
            id="module-title"
            dir="auto"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          Add module
        </Button>
        <Button variant="ghost" onClick={() => setShowArchived((current) => !current)}>
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
      </form>

      {modules.isPending ? <LoadingState label="Loading modules" /> : null}
      {modules.isError ? (
        <ErrorState message="Could not load modules." onRetry={() => void modules.refetch()} />
      ) : null}
      {!modules.isPending && !modules.isError && !modules.data?.length ? (
        <EmptyState message="No modules yet. Add one to get started." />
      ) : null}
      {modules.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.data.map((module) => (
              <TableRow key={module.id}>
                <TableCell className="font-medium">
                  {module.title}
                  {module.archivedAt ? (
                    <span className="ml-2 rounded-input bg-muted px-2 py-0.5 text-xs text-ink-muted">
                      archived
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-ink-muted">{module.position}</TableCell>
                <TableCell className="text-right">
                  {module.archivedAt ? null : (
                    <ConfirmButton
                      label="Archive"
                      title="Archive this module?"
                      description="Exercises and history stay intact."
                      confirmLabel="Archive"
                      destructive
                      onConfirm={() => archive.mutate(module.id)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
