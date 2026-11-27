import { type SubmissionStatus, studentSchema } from "@jaweb/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { SubmissionCard } from "@/components/app/submission-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { useExercises } from "@/lib/authoring";
import { useReviewQueue } from "@/lib/grading-queries";

type Scope = "all" | "live" | "history";
type StatusFilter = "all" | SubmissionStatus;
type Filters = { scope: Scope; studentId: string; exerciseId: string; status: StatusFilter };

const selectClass = "h-9 rounded-md border border-border bg-card px-3 text-sm";
const scopes: Array<{ value: Scope; label: string }> = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "history", label: "History" },
];
const scopeValues: Scope[] = scopes.map((option) => option.value);
const statusValues: StatusFilter[] = ["all", "grading", "graded", "needs_review"];

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((item) => item === value) ?? fallback;
}

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    scope: oneOf(params.get("scope"), scopeValues, "all"),
    studentId: params.get("studentId") ?? "",
    exerciseId: params.get("exerciseId") ?? "",
    status: oneOf(params.get("status"), statusValues, "all"),
  };
}

export function ReviewPage() {
  const submissions = useReviewQueue();
  const exercises = useExercises();
  const students = useQuery({
    queryKey: ["teacher", "students"],
    queryFn: () => apiRequest("/teacher/students", undefined, z.array(studentSchema)),
  });
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(params));
  const { scope, studentId, exerciseId, status } = filters;

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]): void {
    setFilters((current) => ({ ...current, [key]: value }));
    const next = new URLSearchParams(params);
    if (value === "" || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  const rows = (submissions.data ?? [])
    .filter((item) => {
      if (scope === "live" && item.exerciseStatus !== "live") return false;
      if (scope === "history" && item.exerciseStatus === "live") return false;
      if (studentId && item.studentId !== studentId) return false;
      if (exerciseId && item.exerciseId !== exerciseId) return false;
      if (status !== "all" && item.status !== status) return false;
      return true;
    })
    .reverse();
  const filtered = scope !== "all" || Boolean(studentId) || Boolean(exerciseId) || status !== "all";
  const clear = () => {
    setFilters(filtersFromParams(new URLSearchParams()));
    setParams(new URLSearchParams(), { replace: true });
  };

  if (submissions.isPending) return <LoadingState label="Loading submissions" />;
  if (submissions.isError) {
    return (
      <ErrorState
        message="Could not load submissions."
        onRetry={() => void submissions.refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inspect graded answers by live exercise or history, student, and exercise.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Exercise state</p>
          <div className="flex gap-1">
            {scopes.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={scope === option.value ? "default" : "outline"}
                onClick={() => setFilter("scope", option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="review-student">Student</Label>
          <select
            id="review-student"
            className={selectClass}
            value={studentId}
            onChange={(event) => setFilter("studentId", event.target.value)}
          >
            <option value="">All students</option>
            {students.data?.map((student) => (
              <option key={student.id} value={student.id}>
                {student.displayName} ({student.username})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="review-exercise">Exercise</Label>
          <select
            id="review-exercise"
            className={selectClass}
            value={exerciseId}
            onChange={(event) => setFilter("exerciseId", event.target.value)}
          >
            <option value="">All exercises</option>
            {exercises.data?.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="review-status">Status</Label>
          <select
            id="review-status"
            className={selectClass}
            value={status}
            onChange={(event) =>
              setFilter("status", oneOf(event.target.value, statusValues, "all"))
            }
          >
            <option value="all">All statuses</option>
            <option value="needs_review">Needs review</option>
            <option value="graded">Graded</option>
            <option value="grading">Grading</option>
          </select>
        </div>
        {filtered ? (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {rows.length} of {submissions.data?.length ?? 0} submissions
      </p>
      {rows.length === 0 ? (
        <EmptyState
          message="No submissions match these filters."
          action={
            <Button variant="outline" size="sm" onClick={clear}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </div>
  );
}
