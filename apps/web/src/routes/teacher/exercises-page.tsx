import { exerciseSchema } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link } from "react-router";

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
import {
  classesKey,
  exercisesKey,
  useExercises,
  useModules,
  useTeacherClasses,
} from "@/lib/authoring";

export function ExercisesPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [classId, setClassId] = useState("");
  const [type, setType] = useState<"exercise" | "exam">("exercise");
  const exercises = useExercises();
  const modules = useModules();
  const classes = useTeacherClasses();

  const create = useMutation({
    mutationFn: () =>
      apiRequest(
        "/teacher/exercises",
        {
          method: "POST",
          body: JSON.stringify({ title, moduleId, classId, type }),
        },
        exerciseSchema,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exercisesKey });
      void queryClient.invalidateQueries({ queryKey: classesKey });
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !moduleId || !classId) return;
    create.mutate();
    setTitle("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Exercises</h1>
        <p className="mt-2 text-sm text-ink-muted">Draft, schedule, and go live per class.</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="exercise-title">Title</Label>
          <Input
            id="exercise-title"
            dir="auto"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="exercise-module">Module</Label>
          <select
            id="exercise-module"
            className="h-9 rounded-input border border-hairline bg-surface px-3 text-sm"
            value={moduleId}
            onChange={(event) => setModuleId(event.target.value)}
            required
          >
            <option value="">Select a module</option>
            {modules.data?.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="exercise-class">Class</Label>
          <select
            id="exercise-class"
            className="h-9 rounded-input border border-hairline bg-surface px-3 text-sm"
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
            className="h-9 rounded-input border border-hairline bg-surface px-3 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value as "exercise" | "exam")}
          >
            <option value="exercise">Exercise</option>
            <option value="exam">Exam</option>
          </select>
        </div>
        <Button type="submit" className="sm:col-span-2 lg:col-span-4" disabled={create.isPending}>
          Create draft
        </Button>
      </form>

      {exercises.isPending ? <LoadingState label="Loading exercises" /> : null}
      {exercises.isError ? (
        <ErrorState message="Could not load exercises." onRetry={() => void exercises.refetch()} />
      ) : null}
      {!exercises.isPending && !exercises.isError && !exercises.data?.length ? (
        <EmptyState message="No exercises yet. Create a draft above." />
      ) : null}
      {exercises.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercises.data.map((exercise) => (
              <TableRow key={exercise.id}>
                <TableCell className="font-medium">{exercise.title}</TableCell>
                <TableCell className="text-ink-muted">{exercise.type}</TableCell>
                <TableCell>
                  <span
                    className={`rounded-input px-2 py-1 text-xs ${
                      exercise.status === "live"
                        ? "bg-accent/10 text-accent"
                        : "bg-muted text-ink-muted"
                    }`}
                  >
                    {exercise.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    to={`/teacher/exercises/${exercise.id}`}
                    className="text-sm text-accent hover:underline"
                  >
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
