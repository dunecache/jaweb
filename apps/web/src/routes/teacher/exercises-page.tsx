import {
  type ExerciseDto,
  type ExerciseStatus,
  exerciseSchema,
  exerciseStatusSchema,
} from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { ExerciseStatusBadge } from "@/components/app/exercise-status-badge";
import { LiveExercisesStrip } from "@/components/app/live-exercises-strip";
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
import {
  classesKey,
  exercisesKey,
  useExercises,
  useModules,
  useTeacherClasses,
} from "@/lib/authoring";

const selectClass = "h-9 rounded-md border border-border bg-card px-3 text-sm";

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.envelope.error.message : fallback;
}

function groupByModule(items: ExerciseDto[], moduleTitles: Map<string, string>) {
  const groups: Array<{ id: string; title: string; items: ExerciseDto[] }> = [];
  for (const [id, title] of moduleTitles) {
    const members = items.filter((item) => item.moduleId === id);
    if (members.length) groups.push({ id, title, items: members });
  }
  const known = new Set(moduleTitles.keys());
  const other = items.filter((item) => !known.has(item.moduleId));
  if (other.length) groups.push({ id: "other", title: "Other", items: other });
  return groups;
}

export function ExercisesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [classId, setClassId] = useState("");
  const [type, setType] = useState<"exercise" | "exam">("exercise");
  const [showForm, setShowForm] = useState(false);

  const rawStatus = params.get("status") ?? "";
  const parsedStatus = exerciseStatusSchema.safeParse(rawStatus);
  const status = parsedStatus.success ? parsedStatus.data : undefined;
  const moduleFilter = params.get("module") ?? "";

  // The live strip must stay visible even while the list is filtered.
  const liveSource = useExercises();
  const exercises = useExercises({ moduleId: moduleFilter || undefined, status });
  const modules = useModules();
  const classes = useTeacherClasses();

  const create = useMutation({
    mutationFn: () =>
      apiRequest(
        "/teacher/exercises",
        { method: "POST", body: JSON.stringify({ title, moduleId, classId, type }) },
        exerciseSchema,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exercisesKey });
      void queryClient.invalidateQueries({ queryKey: classesKey });
      setTitle("");
      setShowForm(false);
      toast("Draft created.");
    },
    onError: (error) => toast(messageOf(error, "Could not create the draft.")),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !moduleId || !classId) return;
    create.mutate();
  }

  function setFilter(key: "module" | "status", value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const classNameOf = (id: string) =>
    classes.data?.find((item) => item.id === id)?.name ?? "Unassigned class";
  const isPending = exercises.isPending || liveSource.isPending || modules.isPending;
  const isError = exercises.isError || liveSource.isError;
  const hasFilters = Boolean(moduleFilter || status);
  const moduleTitles = new Map((modules.data ?? []).map((item) => [item.id, item.title]));
  const groups = groupByModule(exercises.data ?? [], moduleTitles);

  return (
    <div className="space-y-8">
      <LiveExercisesStrip
        items={liveSource.data?.filter((item) => item.status === "live") ?? []}
        classNameOf={classNameOf}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Exercises</h1>
          <p className="mt-2 text-sm text-muted-foreground">Draft, schedule, and go live per class.</p>
        </div>
        <Button variant="outline" aria-expanded={showForm} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Hide form" : "New draft"}
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="exercise-title">Title</Label>
            <Input
              id="exercise-title"
              name="title"
              dir="auto"
              autoComplete="off"
              spellCheck={false}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exercise-module">Module</Label>
            <select
              id="exercise-module"
              name="moduleId"
              className={selectClass}
              value={moduleId}
              onChange={(event) => setModuleId(event.target.value)}
              required
            >
              <option value="">Select a module</option>
              {modules.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exercise-class">Class</Label>
            <select
              id="exercise-class"
              name="classId"
              className={selectClass}
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              required
            >
              <option value="">Select a class</option>
              {classes.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exercise-type">Type</Label>
            <select
              id="exercise-type"
              name="type"
              className={selectClass}
              value={type}
              onChange={(event) => setType(event.target.value as "exercise" | "exam")}
            >
              <option value="exercise">Exercise</option>
              <option value="exam">Exam</option>
            </select>
          </div>
          <Button type="submit" className="sm:col-span-2 lg:col-span-4" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create draft"}
          </Button>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-module">Module</Label>
          <select
            id="filter-module"
            name="module"
            className={selectClass}
            value={moduleFilter}
            onChange={(event) => setFilter("module", event.target.value)}
          >
            <option value="">All modules</option>
            {(modules.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-status">Status</Label>
          <select
            id="filter-status"
            name="status"
            className={selectClass}
            value={status ?? ""}
            onChange={(event) => setFilter("status", event.target.value as ExerciseStatus | "")}
          >
            <option value="">Any status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live now</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {isPending ? <LoadingState label="Loading exercises…" /> : null}
      {isError ? (
        <ErrorState message="Could not load exercises." onRetry={() => void exercises.refetch()} />
      ) : null}
      {!isPending && !isError && !groups.length ? (
        <EmptyState
          message={hasFilters ? "No exercises match these filters." : "No exercises yet."}
          action={
            hasFilters ? (
              <Button variant="outline" onClick={() => setParams(new URLSearchParams())}>
                Clear filters
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowForm(true)}>
                New draft
              </Button>
            )
          }
        />
      ) : null}

      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <h2 className="font-serif text-xl text-foreground">{group.title}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[320px] truncate font-medium">{item.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.type === "exam" ? "Exam" : "Exercise"}
                  </TableCell>
                  <TableCell>
                    <ExerciseStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={`/teacher/exercises/${item.id}`}
                      className="text-sm whitespace-nowrap text-primary hover:underline"
                    >
                      Open editor
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
