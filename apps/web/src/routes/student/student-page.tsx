import type { StudentCurrent, StudentSafeQuestion } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { usePolledQuery } from "@/lib/polling";

function draftKey(questionId: string): string {
  return `jaweb:draft:${questionId}`;
}

function QuestionForm({
  question,
  onSubmit,
  submitting,
}: {
  question: StudentSafeQuestion;
  onSubmit: (answer: unknown) => void;
  submitting: boolean;
}) {
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
    <div className="rounded-card border border-hairline bg-surface p-6">
      <p dir="auto" className="font-medium text-ink">
        {question.prompt}
      </p>
      <div className="mt-4 space-y-2">
        {question.options?.map((option) => (
          <label key={option.id} className="flex items-center gap-3 text-sm text-ink">
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
            aria-label={`Answer for ${question.prompt}`}
            className="min-h-24 w-full rounded-input border border-hairline bg-surface p-3 text-sm"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        ) : null}
      </div>
      <div className="mt-5">
        <ConfirmButton
          variant="default"
          label="Submit answer"
          title="Submit your answer?"
          description="You can only submit once. Check your answer before confirming."
          confirmLabel="Submit"
          onConfirm={() => onSubmit(answer)}
        />
      </div>
      {!canSubmit ? (
        <p className="mt-2 text-xs text-ink-muted">Choose or type an answer first.</p>
      ) : null}
      {submitting ? <p className="mt-2 text-xs text-ink-muted">Submitting…</p> : null}
    </div>
  );
}

export function StudentPage() {
  const queryClient = useQueryClient();
  const me = useMe();
  const current = usePolledQuery<StudentCurrent>(["student", "current"], "/student/current");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const submit = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: unknown }) =>
      apiRequest("/student/submissions", {
        method: "POST",
        body: JSON.stringify({ questionId, answer }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["student", "current"] }),
  });

  if (me.isPending || current.isPending) return <LoadingState label="Loading your exercise" />;
  if (me.isError)
    return (
      <ErrorState message="Could not verify your session." onRetry={() => void me.refetch()} />
    );
  if (current.isError) {
    return <ErrorState message="Connection lost." onRetry={() => void current.refetch()} />;
  }
  const data = current.data;
  if (!data?.exercise) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <h1 className="font-display text-3xl text-ink">Nothing is live right now.</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your teacher will push an exercise to your class.
        </p>
      </div>
    );
  }

  const offset = Date.parse(data.serverTime) - Date.now();
  const remaining = data.closesAt
    ? Math.max(0, Math.round((Date.parse(data.closesAt) - (now + offset)) / 1000))
    : null;
  const answered = new Set(data.submissions.map((item) => item.questionId));

  return (
    <div className="mx-auto max-w-[720px] space-y-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink" dir="auto">
            {data.exercise.title}
          </h1>
          <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
            You answered {answered.size} of {data.questions.length}.
          </p>
        </div>
        {remaining !== null ? (
          <div className="text-right" aria-live="polite">
            <p className="font-mono text-lg text-ink">
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
            </p>
            <p className="text-xs text-ink-muted">time left</p>
          </div>
        ) : null}
      </div>

      {data.questions.map((question) => (
        <div key={question.id} className="space-y-2">
          {answered.has(question.id) ? (
            <div
              className="rounded-card border border-success/30 bg-success/5 p-4 text-sm text-ink"
              aria-live="polite"
            >
              <span dir="auto">{question.prompt}</span>
              <span className="ml-2 text-success">submitted</span>
            </div>
          ) : (
            <QuestionForm
              question={question}
              submitting={submit.isPending}
              onSubmit={(answer) => submit.mutate({ questionId: question.id, answer })}
            />
          )}
        </div>
      ))}
      {submit.isError ? (
        <div role="alert">
          <ErrorState message="Could not submit your answer." onRetry={() => submit.reset()} />
        </div>
      ) : null}
      <Button variant="ghost" onClick={() => void current.refetch()}>
        Refresh
      </Button>
    </div>
  );
}
