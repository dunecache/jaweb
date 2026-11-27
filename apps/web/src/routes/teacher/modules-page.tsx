import type { ModuleDto, PatchModuleRequest } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { RenameDialog } from "@/components/app/rename-dialog";
import { useToast } from "@/components/app/toaster";
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
import { ApiError, apiRequest } from "@/lib/api";
import { modulesKey, useModules } from "@/lib/authoring";

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.envelope.error.message : fallback;
}

function swapPositions(items: ModuleDto[], from: number, to: number): ModuleDto[] {
  const moving = items[from];
  const other = items[to];
  if (!moving || !other) return items;
  const reordered = [...items];
  reordered[from] = other;
  reordered[to] = moving;
  return reordered;
}

export function ModulesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const titleInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const showArchived = searchParams.get("archived") === "1";
  const modules = useModules(showArchived);
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: modulesKey });

  function toggleArchived() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (next.get("archived") === "1") next.delete("archived");
      else next.set("archived", "1");
      return next;
    });
  }

  const create = useMutation({
    mutationFn: (value: string) =>
      apiRequest(
        "/teacher/modules",
        { method: "POST", body: JSON.stringify({ title: value }) },
        undefined,
      ),
    onSuccess: () => {
      invalidate();
      setTitle("");
      toast("Module added.");
    },
    onError: (error) => toast(messageOf(error, "Could not add the module.")),
  });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchModuleRequest }) =>
      apiRequest(`/teacher/modules/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_result, variables) => {
      invalidate();
      if (variables.body.archived) toast("Module archived.");
      else if (variables.body.title) toast("Module renamed.");
      else toast("Order updated.");
    },
    onError: (error) => toast(messageOf(error, "Could not update the module.")),
  });
  const reorder = useMutation({
    mutationFn: async (items: ModuleDto[]) => {
      await Promise.all(
        items.map((item, index) =>
          apiRequest(`/teacher/modules/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({ position: index + 1 }),
          }),
        ),
      );
    },
    onSuccess: () => {
      invalidate();
      toast("Order updated.");
    },
    onError: (error) => toast(messageOf(error, "Could not reorder the modules.")),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (value) create.mutate(value);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Modules</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Group exercises into the order students will see them.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="module-title">Module name</Label>
          <Input
            id="module-title"
            ref={titleInput}
            name="title"
            autoComplete="off"
            dir="auto"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Add module
        </Button>
        <Button type="button" variant="ghost" onClick={toggleArchived}>
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
      </form>

      <div className="max-w-[720px]">
        {modules.isPending ? <LoadingState label="Loading modules" /> : null}
        {modules.isError ? (
          <ErrorState
            message="Could not load modules. Check your connection, then try again."
            onRetry={() => void modules.refetch()}
          />
        ) : null}
        {!modules.isPending && !modules.isError && !modules.data?.length ? (
          <EmptyState
            message="No modules yet. Add one to get started."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => titleInput.current?.focus()}
              >
                Add a module
              </Button>
            }
          />
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
              {modules.data.map((module, index) => {
                const items = modules.data;
                const previous = index > 0 ? items[index - 1] : undefined;
                const next = index < items.length - 1 ? items[index + 1] : undefined;
                return (
                  <TableRow key={module.id}>
                    <TableCell className="max-w-[320px] font-medium">
                      <span className="block truncate" title={module.title}>
                        {module.title}
                      </span>
                      {module.archivedAt ? (
                        <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          archived
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {module.position}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {module.archivedAt ? null : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Move ${module.title} up`}
                              title="Move up"
                              disabled={!previous || reorder.isPending}
                              onClick={() => reorder.mutate(swapPositions(items, index, index - 1))}
                            >
                              <ArrowUp />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Move ${module.title} down`}
                              title="Move down"
                              disabled={!next || reorder.isPending}
                              onClick={() => reorder.mutate(swapPositions(items, index, index + 1))}
                            >
                              <ArrowDown />
                            </Button>
                            <RenameDialog
                              title="Rename module"
                              description="Exercises stay in this module."
                              initialValue={module.title}
                              onSave={(value) =>
                                patch.mutate({ id: module.id, body: { title: value } })
                              }
                            />
                            <ConfirmButton
                              label="Archive"
                              title="Archive this module?"
                              description="Exercises and history stay intact."
                              confirmLabel="Archive"
                              destructive
                              pending={patch.isPending}
                              onConfirm={() =>
                                patch.mutate({ id: module.id, body: { archived: true } })
                              }
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </div>
    </div>
  );
}
