import type { Monitor, MonitorCell } from "@jaweb/shared";
import { Link, useParams } from "react-router";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useExercise } from "@/lib/exercise-query";
import { usePolledQuery } from "@/lib/polling";

const LABELS: Record<MonitorCell, string> = {
  not_opened: "Not opened",
  opened: "Opened",
  submitted: "Submitted",
  grading: "Grading",
  graded: "Graded",
  needs_review: "Needs review",
};

export function MonitorPage() {
  const { id = "" } = useParams();
  const exercise = useExercise(id);
  const monitor = usePolledQuery<Monitor>(
    ["teacher", "exercises", id, "monitor"],
    `/teacher/exercises/${id}/monitor`,
    5_000,
    10_000,
  );

  // Deep links carry the two filters the review queue understands: student + exercise.
  const reviewHref = (studentId: string) =>
    `/teacher/review?${new URLSearchParams({ studentId, exerciseId: id }).toString()}`;

  if (exercise.isPending || monitor.isPending) return <LoadingState label="Loading monitor" />;
  if (exercise.isError || monitor.isError) {
    return (
      <ErrorState message="Could not load the monitor." onRetry={() => void monitor.refetch()} />
    );
  }
  const data = monitor.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Live monitor</h1>
          <p className="mt-2 text-sm text-muted-foreground">{exercise.data?.title}</p>
        </div>
        <div className="flex gap-3">
          <Link to={`/teacher/exercises/${id}`} className="text-sm text-primary hover:underline">
            Edit exercise
          </Link>
          <a
            href={`/api/teacher/exercises/${id}/export.csv`}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Submitted", data.counts.submitted],
          ["Grading", data.counts.grading],
          ["Needs review", data.counts.needsReview],
          ["Graded", data.counts.graded],
          ["Missing", data.counts.missing],
          ["Median (s)", data.medianSeconds ?? "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-mono text-xl text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {data.flagged.length ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">
            {data.flagged.length} answered before reading
          </p>
          <ul className="mt-2 list-disc ps-5 text-muted-foreground">
            {data.flagged.map((item) => (
              <li key={item.submissionId}>
                {item.username} · {item.questionId} · {item.submittedAt}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.roster.length === 0 ? (
        <EmptyState message="No students in this class yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                {data.questions.map((question) => (
                  <TableHead key={question.id}>Q{question.position}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.roster.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell className="font-medium">
                    <Link
                      to={reviewHref(row.studentId)}
                      className="rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span dir="auto">{row.displayName}</span>
                      <span className="ms-2 font-mono text-xs text-muted-foreground">
                        {row.username}
                      </span>
                    </Link>
                  </TableCell>
                  {data.questions.map((question) => {
                    const cell = row.cells[question.id] ?? "not_opened";
                    const badge = (
                      <span
                        className={`rounded-md px-2 py-1 text-xs ${
                          cell === "graded"
                            ? "bg-emerald-50 text-emerald-700"
                            : cell === "needs_review"
                              ? "bg-amber-50 text-amber-700"
                              : cell === "grading"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {LABELS[cell]}
                      </span>
                    );
                    return (
                      <TableCell key={question.id}>
                        {cell === "not_opened" ? (
                          badge
                        ) : (
                          <Link
                            to={reviewHref(row.studentId)}
                            className="inline-block rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {badge}
                          </Link>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
