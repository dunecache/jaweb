import type { TeacherSubmission, Verdict } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { reviewKey, useReviewQueue } from "@/lib/grading-queries";

function ReviewRow({ submission }: { submission: TeacherSubmission }) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState("0");
  const [verdict, setVerdict] = useState<Verdict>("wrong");
  const [feedback, setFeedback] = useState("");
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: reviewKey });

  const override = useMutation({
    mutationFn: () =>
      apiRequest(`/teacher/submissions/${submission.id}/override`, {
        method: "POST",
        body: JSON.stringify({ score: Number(score), verdict, feedback }),
      }),
    onSuccess: invalidate,
  });
  const unlock = useMutation({
    mutationFn: () =>
      apiRequest(`/teacher/submissions/${submission.id}/unlock`, { method: "POST" }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4 rounded-card border border-hairline bg-surface p-6">
      <p dir="auto" className="text-sm text-ink">
        {submission.feedback || "No grader feedback."}
      </p>
      <p className="text-xs text-ink-muted">Submitted {submission.submittedAt}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`score-${submission.id}`}>Score</Label>
          <Input
            id={`score-${submission.id}`}
            type="number"
            step="0.5"
            min="0"
            max="1"
            value={score}
            onChange={(event) => setScore(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`verdict-${submission.id}`}>Verdict</Label>
          <select
            id={`verdict-${submission.id}`}
            className="h-9 rounded-input border border-hairline bg-surface px-3 text-sm"
            value={verdict}
            onChange={(event) => setVerdict(event.target.value as Verdict)}
          >
            <option value="correct">correct</option>
            <option value="partial">partial</option>
            <option value="wrong">wrong</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`feedback-${submission.id}`}>Feedback</Label>
          <Input
            id={`feedback-${submission.id}`}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            maxLength={240}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => override.mutate()} disabled={override.isPending}>
          Save override
        </Button>
        <ConfirmButton
          label="Unlock for retake"
          title="Unlock this question?"
          description="The old submission is archived and the student gets a fresh attempt."
          confirmLabel="Unlock"
          onConfirm={() => unlock.mutate()}
        />
      </div>
    </div>
  );
}

export function ReviewPage() {
  const submissions = useReviewQueue();
  const pending = submissions.data?.filter((item) => item.status !== "graded") ?? [];

  if (submissions.isPending) return <LoadingState label="Loading review queue" />;
  if (submissions.isError) {
    return (
      <ErrorState
        message="Could not load the review queue."
        onRetry={() => void submissions.refetch()}
      />
    );
  }
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Review queue</h1>
        <p className="mt-2 text-sm text-ink-muted">Submissions that need a human decision.</p>
      </div>
      {pending.length === 0 ? (
        <EmptyState message="Nothing needs review right now." />
      ) : (
        <div className="space-y-4">
          {pending.map((submission) => (
            <ReviewRow key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </div>
  );
}
