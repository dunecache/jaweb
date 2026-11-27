import { type Answer, deriveVerdict, type TeacherSubmission, type Verdict } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { useToast } from "@/components/app/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/api";
import { reviewKey } from "@/lib/grading-queries";

const VERDICT_STYLE: Record<Verdict, string> = {
  correct: "text-emerald-700",
  partial: "text-amber-700",
  wrong: "text-destructive",
};

const SCORE_CHOICES = [0, 0.25, 0.5, 0.75, 1] as const;

// A stored score can be continuous (e.g. multi-select partial credit); snap it
// to the nearest of the choices the teacher can actually pick.
function snapScore(score: number | null): number {
  const value = score ?? 0;
  return SCORE_CHOICES.reduce<number>(
    (best, choice) => (Math.abs(choice - value) < Math.abs(best - value) ? choice : best),
    0,
  );
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.envelope.error.message : fallback;
}

function answerText(answer: Answer | null): string {
  if (!answer) return "No answer recorded.";
  if (answer.kind === "free_text") return answer.text || "(empty answer)";
  if (answer.kind === "single_choice") return `Selected option ${answer.optionId}`;
  return `Selected options: ${answer.optionIds.join(", ") || "none"}`;
}

function statusLabel(status: TeacherSubmission["status"]): string {
  if (status === "needs_review") return "Needs review";
  if (status === "grading") return "Grading";
  return "Graded";
}

export function SubmissionCard({ submission }: { submission: TeacherSubmission }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [score, setScore] = useState(() => snapScore(submission.score));
  const [feedback, setFeedback] = useState(submission.feedback ?? "");

  useEffect(() => {
    setScore(snapScore(submission.score));
    setFeedback(submission.feedback ?? "");
  }, [submission.score, submission.feedback]);

  // §9.1: verdict is always derived from score, never picked separately.
  const verdict = deriveVerdict(score);
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: reviewKey });

  const override = useMutation({
    mutationFn: () =>
      apiRequest(`/teacher/submissions/${submission.id}/override`, {
        method: "POST",
        body: JSON.stringify({ score, verdict, feedback }),
      }),
    onSuccess: () => {
      toast("Override saved.");
      invalidate();
    },
    onError: (error) => toast(messageOf(error, "Could not save the override.")),
  });
  const unlock = useMutation({
    mutationFn: () =>
      apiRequest(`/teacher/submissions/${submission.id}/unlock`, { method: "POST" }),
    onSuccess: () => {
      toast("Question unlocked for a retake.");
      invalidate();
    },
    onError: (error) => toast(messageOf(error, "Could not unlock the question.")),
  });
  const busy = override.isPending || unlock.isPending;

  return (
    <article className="space-y-3 rounded-xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {submission.exerciseTitle} · {submission.exerciseStatus === "live" ? "Live" : "History"}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {submission.studentDisplayName}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              ({submission.studentUsername})
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Submitted {submission.submittedAt} · {statusLabel(submission.status)} · graded by{" "}
            {submission.gradedBy ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
            {submission.points ?? 0} pts
          </span>
          <span
            className={`rounded-md border border-border bg-background px-2 py-1 text-xs ${submission.verdict ? VERDICT_STYLE[submission.verdict] : "text-muted-foreground"}`}
          >
            {submission.verdict ?? "not graded"}
          </span>
          {submission.flagged ? (
            <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-amber-700">
              Flagged — answered quickly
            </span>
          ) : null}
        </div>
      </header>

      <div>
        <p className="text-xs text-muted-foreground">Question</p>
        <p dir="auto" className="mt-1 text-sm text-foreground">
          {submission.questionPrompt}
        </p>
      </div>

      <div className="rounded-md border border-border bg-background p-3">
        <p className="text-xs text-muted-foreground">Student answer</p>
        <p dir="auto" className="mt-1 whitespace-pre-wrap font-mono text-sm text-foreground">
          {answerText(submission.answer)}
        </p>
      </div>

      <div className="rounded-md border border-border bg-background p-3">
        <p className="text-xs text-muted-foreground">Grader feedback</p>
        <p dir="auto" className="mt-1 text-sm text-foreground">
          {submission.feedback || "No grader feedback."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Hide grade form" : "Adjust grade"}
        </Button>
        <ConfirmButton
          label="Unlock for retake"
          title="Unlock this question?"
          description="The old submission is archived and the student gets a fresh attempt."
          confirmLabel="Unlock"
          disabled={busy}
          onConfirm={() => unlock.mutate()}
        />
      </div>

      {expanded ? (
        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Score</legend>
            <div className="flex flex-wrap gap-1">
              {SCORE_CHOICES.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={score === value ? "default" : "outline"}
                  aria-pressed={score === value}
                  aria-label={`Score ${value}`}
                  onClick={() => setScore(value)}
                  className="h-9 min-w-12 px-3 tabular-nums"
                >
                  {value}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Verdict: <span className={VERDICT_STYLE[verdict]}>{verdict}</span>
            </p>
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`feedback-${submission.id}`}>Feedback</Label>
            <Input
              id={`feedback-${submission.id}`}
              dir="auto"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              maxLength={240}
            />
          </div>
          <Button className="sm:col-span-2" onClick={() => override.mutate()} disabled={busy}>
            {override.isPending ? "Saving..." : "Save override"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
