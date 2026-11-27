import type { StudentCurrent, StudentSafeQuestion, SubmissionDto } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/app/data-state";
import { StudentHeader } from "@/components/app/student-header";
import { useToast } from "@/components/app/toaster";
import { Button } from "@/components/ui/button";
import { answerText } from "@/lib/answer-display";
import { apiRequest } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { countdownMilestone } from "@/lib/countdown";
import { draftKey } from "@/lib/drafts";
import { useI18n } from "@/lib/i18n";
import { usePolledQuery } from "@/lib/polling";

function QuestionForm({
  question,
  onSubmit,
  submitting,
}: {
  question: StudentSafeQuestion;
  onSubmit: (answer: unknown) => void;
  submitting: boolean;
}) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<string>(
    () => localStorage.getItem(draftKey(question.id)) ?? "",
  );
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey(question.id)) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [text, setText] = useState(() => localStorage.getItem(draftKey(question.id)) ?? "");

  useEffect(() => {
    if (question.kind === "single_choice") localStorage.setItem(draftKey(question.id), choice);
    if (question.kind === "multi_select")
      localStorage.setItem(draftKey(question.id), JSON.stringify(selected));
    if (question.kind === "free_text") localStorage.setItem(draftKey(question.id), text);
  }, [question.id, question.kind, choice, selected, text]);

  const answer =
    question.kind === "single_choice"
      ? { kind: "single_choice", optionId: choice }
      : question.kind === "multi_select"
        ? { kind: "multi_select", optionIds: selected }
        : { kind: "free_text", text };
  const canSubmit =
    question.kind === "free_text"
      ? text.trim().length > 0
      : question.kind === "single_choice"
        ? choice.length > 0
        : selected.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p dir="auto" className="font-medium text-foreground">
        {question.prompt}
      </p>
      <div className="mt-4 space-y-2">
        {question.options?.map((option) => (
          <label key={option.id} className="flex items-center gap-3 text-sm text-foreground">
            <input
              type={question.kind === "single_choice" ? "radio" : "checkbox"}
              name={`question-${question.id}`}
              checked={
                question.kind === "single_choice"
                  ? choice === option.id
                  : selected.includes(option.id)
              }
              onChange={() => {
                if (question.kind === "single_choice") setChoice(option.id);
                else
                  setSelected((current) =>
                    current.includes(option.id)
                      ? current.filter((id) => id !== option.id)
                      : [...current, option.id],
                  );
              }}
            />
            <span dir="auto">{option.text}</span>
          </label>
        ))}
        {question.kind === "free_text" ? (
          <textarea
            dir="auto"
            aria-label={t("answerFor", { prompt: question.prompt })}
            className="min-h-24 w-full rounded-md border border-border bg-card p-3 text-sm"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        ) : null}
      </div>
      <div className="mt-5">
        <ConfirmButton
          variant="default"
          label={t("submitAnswer")}
          title={t("submitAnswer")}
          description={t("submitOnceDescription")}
          confirmLabel={t("submitAnswer")}
          disabled={!canSubmit || submitting}
          onConfirm={() => onSubmit(answer)}
        />
      </div>
      {!canSubmit ? (
        <p className="mt-2 text-xs text-muted-foreground">{t("chooseAnswer")}</p>
      ) : null}
      {submitting ? <p className="mt-2 text-xs text-muted-foreground">{t("submitting")}</p> : null}
    </div>
  );
}

function SubmittedQuestion({
  question,
  submission,
}: {
  question: StudentSafeQuestion;
  submission: SubmissionDto | undefined;
}) {
  const { t } = useI18n();
  const verdict = submission?.verdict;
  const tone =
    verdict === "correct"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : verdict === "partial"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : verdict === "wrong"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-card text-muted-foreground";
  // Score and verdict are null while an at_close exercise is live; feedback is
  // null until close for every exercise. The server enforces this, the UI just
  // renders whatever the allow-list returned.
  const earned = submission?.score == null ? null : Math.round(question.points * submission.score);
  const label =
    submission?.status === "graded" && verdict
      ? t(verdict)
      : submission?.status === "grading"
        ? t("grading")
        : submission?.status === "needs_review"
          ? t("awaitingReview")
          : t("submitted");

  return (
    <div className={cn("rounded-xl border p-4 text-sm", tone)} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span dir="auto" className="font-medium text-foreground">
          {question.prompt}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      {submission?.answer ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("yourAnswer")}{" "}
          <span dir="auto" className="break-words text-foreground">
            {answerText(submission.answer, question.options ?? null)}
          </span>
        </p>
      ) : null}
      {earned !== null ? (
        <p className="mt-1 font-mono text-xs">{t("earnedPoints", { count: earned })}</p>
      ) : null}
      {submission?.feedback ? (
        <p dir="auto" className="mt-2">
          {submission.feedback}
        </p>
      ) : null}
    </div>
  );
}

function LiveExercise({
  data,
  pollError,
  onRetry,
}: {
  data: StudentCurrent;
  pollError: boolean;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const submit = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: unknown }) =>
      apiRequest("/student/submissions", {
        method: "POST",
        body: JSON.stringify({ questionId, answer }),
      }),
    onSuccess: (_data, variables) => {
      localStorage.removeItem(draftKey(variables.questionId));
      toast(t("submitted"));
      void queryClient.invalidateQueries({ queryKey: ["student", "current"] });
    },
  });

  // Sample the clock skew once per payload. Recomputing it on every render
  // cancels out the 1s tick and freezes the countdown between polls.
  const offset = useMemo(() => Date.parse(data.serverTime) - Date.now(), [data.serverTime]);
  const remaining = data.closesAt
    ? Math.max(0, Math.round((Date.parse(data.closesAt) - (now + offset)) / 1000))
    : null;
  // Announce only at milestones so screen readers are not flooded by the
  // per-second visual tick. Each band maps to a stable localized string.
  const milestone = countdownMilestone(remaining);
  const milestoneNotice = milestone ? t(milestone) : "";
  const answered = new Set(data.submissions.map((item) => item.questionId));

  return (
    <div className="space-y-6">
      {!online || pollError ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700"
          role="status"
        >
          <span>{t("disconnected")}</span>
          {pollError ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t("refresh")}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground" dir="auto">
            {data.exercise?.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
            {t("youAnswered", { count: answered.size, total: data.questions.length })}
          </p>
        </div>
        {remaining !== null ? (
          <div className="text-end">
            <p aria-hidden="true" className="font-mono text-lg text-foreground">
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
            </p>
            <p aria-hidden="true" className="text-xs text-muted-foreground">
              {t("timeLeft")}
            </p>
            <span className="sr-only" aria-live="polite">
              {milestoneNotice}
            </span>
          </div>
        ) : null}
      </div>

      {data.questions.map((question) => (
        <div key={question.id} className="space-y-2">
          {answered.has(question.id) ? (
            <SubmittedQuestion
              question={question}
              submission={data.submissions.find((item) => item.questionId === question.id)}
            />
          ) : (
            <QuestionForm
              question={question}
              submitting={submit.isPending && submit.variables?.questionId === question.id}
              onSubmit={(answer) => submit.mutate({ questionId: question.id, answer })}
            />
          )}
        </div>
      ))}
      {submit.isError ? (
        <div role="alert">
          <ErrorState message={t("submitFailed")} onRetry={() => submit.reset()} />
        </div>
      ) : null}
      <Button
        variant="ghost"
        onClick={() => void queryClient.invalidateQueries({ queryKey: ["student", "current"] })}
      >
        {t("refresh")}
      </Button>
    </div>
  );
}

export function StudentPage() {
  const { t } = useI18n();
  const me = useMe();
  const current = usePolledQuery<StudentCurrent>(["student", "current"], "/student/current");

  let content: ReactNode;
  if (me.isPending || current.isPending) {
    content = <LoadingState label={t("loadingExercise")} />;
  } else if (me.isError) {
    content = <ErrorState message={t("sessionError")} onRetry={() => void me.refetch()} />;
  } else if (!current.data?.exercise) {
    // No cached exercise to fall back on: a poll failure is a full error.
    content = current.isError ? (
      <ErrorState message={t("connectionLost")} onRetry={() => void current.refetch()} />
    ) : (
      <div>
        <h1 className="font-serif text-3xl text-foreground">{t("nothingLive")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("nothingLiveHint")}</p>
      </div>
    );
  } else {
    // Keep the exercise and its in-progress answers mounted on a failed poll;
    // surface a non-blocking banner instead of replacing the whole page.
    content = (
      <LiveExercise
        data={current.data}
        pollError={current.isError}
        onRetry={() => void current.refetch()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[720px] px-4 py-10">
        {content}
      </main>
    </div>
  );
}
