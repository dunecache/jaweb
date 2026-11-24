import { historyDetailSchema, historyListSchema } from "@jaweb/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { apiRequest } from "@/lib/api";
import { LocaleSwitcher, useI18n } from "@/lib/i18n";

export function HistoryPage() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["student", "history"],
    queryFn: () => apiRequest("/student/history", undefined, historyListSchema),
  });
  const detail = useQuery({
    queryKey: ["student", "history", selected],
    queryFn: () => apiRequest(`/student/history/${selected}`, undefined, historyDetailSchema),
    enabled: selected !== null,
  });

  if (list.isPending) return <LoadingState label="Loading history" />;
  if (list.isError)
    return (
      <ErrorState message="Could not load your history." onRetry={() => void list.refetch()} />
    );

  return (
    <div className="mx-auto max-w-[720px] space-y-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{t("yourHistory")}</h1>
          <p className="mt-2 text-sm text-ink-muted">{t("historyHint")}</p>
        </div>
        <LocaleSwitcher />
      </div>

      {list.data.exercises.length === 0 ? (
        <EmptyState message={t("emptyHistory")} />
      ) : (
        <div className="space-y-3">
          {list.data.exercises.map((item) => (
            <button
              key={item.exerciseId}
              type="button"
              onClick={() => setSelected(item.exerciseId)}
              className="flex w-full items-center justify-between rounded-card border border-hairline bg-surface p-5 text-left"
            >
              <div>
                <p dir="auto" className="font-medium text-ink">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {t("answeredOf", { count: item.submittedCount, total: item.questionCount })}
                </p>
              </div>
              <span className="font-mono text-lg text-ink">{item.myPoints} pts</span>
            </button>
          ))}
        </div>
      )}

      {detail.isPending ? <LoadingState label="Loading exercise" /> : null}
      {detail.isError ? (
        <ErrorState message="Could not load this exercise." onRetry={() => void detail.refetch()} />
      ) : null}
      {detail.data ? (
        <div className="space-y-4">
          <h2 className="font-display text-xl text-ink" dir="auto">
            {detail.data.title}
          </h2>
          {detail.data.questions.map((question) => {
            const submission = detail.data.submissions.find(
              (item) => item.questionId === question.id,
            );
            return (
              <div key={question.id} className="rounded-card border border-hairline bg-surface p-5">
                <p dir="auto" className="font-medium text-ink">
                  {question.prompt}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {submission?.verdict ?? "no answer"} · {question.points} pts
                </p>
                {question.revealed ? (
                  <p className="mt-2 text-sm text-success" dir="auto">
                    Correct: {question.correctOptionIds?.join(", ") ?? question.modelAnswer ?? "—"}
                  </p>
                ) : null}
                {submission?.feedback ? (
                  <p className="mt-2 text-sm text-ink-muted" dir="auto">
                    {submission.feedback}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
