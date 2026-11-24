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
          <h1 className="font-display text-3xl font-semibold text-ink">Live monitor</h1>
          <p className="mt-2 text-sm text-ink-muted">{exercise.data?.title}</p>
        </div>
        <div className="flex gap-3">
          <Link to={`/teacher/exercises/${id}`} className="text-sm text-accent hover:underline">
            Edit exercise
          </Link>
          <a
            href={`/api/teacher/exercises/${id}/export.csv`}
            className="rounded-button border border-hairline bg-surface px-3 py-2 text-sm"
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
          <div key={String(label)} className="rounded-card border border-hairline bg-surface p-4">
            <p className="text-xs text-ink-muted">{label}</p>
            <p className="font-mono text-xl text-ink">{value}</p>
          </div>
        ))}
      </div>

      {data.flagged.length ? (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm">
          <p className="font-medium text-danger">{data.flagged.length} answered before reading</p>
          <ul className="mt-2 list-disc pl-5 text-ink-muted">
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
        <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
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
                    <span dir="auto">{row.displayName}</span>
                    <span className="ml-2 font-mono text-xs text-ink-muted">{row.username}</span>
                  </TableCell>
                  {data.questions.map((question) => {
                    const cell = row.cells[question.id] ?? "not_opened";
                    return (
                      <TableCell key={question.id}>
                        <span
                          className={`rounded-input px-2 py-1 text-xs ${
                            cell === "graded"
                              ? "bg-success/10 text-success"
                              : cell === "needs_review"
                                ? "bg-warning/10 text-warning"
                                : cell === "grading"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-muted text-ink-muted"
                          }`}
                        >
                          {LABELS[cell]}
                        </span>
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
