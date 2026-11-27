import { historyDetailSchema, historyListSchema } from "@jaweb/shared";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/data-state";
import { StudentHeader } from "@/components/app/student-header";
import { answerText } from "@/lib/answer-display";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

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

  let content: ReactNode;
  if (list.isPending) {
    content = <LoadingState label={t("loadingHistory")} />;
  } else if (list.isError) {
    content = <ErrorState message={t("historyLoadError")} onRetry={() => void list.refetch()} />;
  } else {
    content = (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-foreground">{t("yourHistory")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("historyHint")}</p>
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
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-5 text-start"
              >
                <div>
                  <p dir="auto" className="font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("answeredOf", { count: item.submittedCount, total: item.questionCount })}
                  </p>
                </div>
                <span className="font-mono text-lg text-foreground">
                  {item.myPoints} {t("pointsShort")}
                </span>
              </button>
            ))}
          </div>
        )}

        {selected !== null && detail.isPending ? (
          <LoadingState label={t("loadingExercise")} />
        ) : null}
        {detail.isError ? (
          <ErrorState message={t("exerciseLoadError")} onRetry={() => void detail.refetch()} />
        ) : null}
        {detail.data ? (
          <div className="space-y-4">
            <h2 className="font-serif text-xl text-foreground" dir="auto">
              {detail.data.title}
            </h2>
            {detail.data.questions.map((question) => {
              const submission = detail.data.submissions.find(
                (item) => item.questionId === question.id,
              );
              const answeredText = submission?.answer
                ? answerText(submission.answer, question.options ?? null)
                : null;
              // Map stored choice ids back to their labels so revealed answers
              // read as text, not raw option ids.
              const correctAnswer =
                question.correctOptionIds
                  ?.map((id) => question.options?.find((option) => option.id === id)?.text ?? id)
                  .join(", ") ??
                question.modelAnswer ??
                "—";
              return (
                <div key={question.id} className="rounded-xl border border-border bg-card p-5">
                  <p dir="auto" className="font-medium text-foreground">
                    {question.prompt}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {submission?.status === "grading"
                      ? t("grading")
                      : submission?.status === "needs_review"
                        ? t("awaitingReview")
                        : submission?.verdict
                          ? t(submission.verdict)
                          : t("noAnswer")}{" "}
                    · {question.points} {t("pointsShort")}
                  </p>
                  {answeredText ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("yourAnswer")}{" "}
                      <span dir="auto" className="break-words text-foreground">
                        {answeredText}
                      </span>
                    </p>
                  ) : null}
                  {question.revealed ? (
                    <p className="mt-2 text-sm text-emerald-700" dir="auto">
                      {t("closedAnswers")} {correctAnswer}
                    </p>
                  ) : null}
                  {submission?.feedback ? (
                    <p className="mt-2 text-sm text-muted-foreground" dir="auto">
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

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[720px] px-4 py-10">
        {content}
      </main>
    </div>
  );
}
