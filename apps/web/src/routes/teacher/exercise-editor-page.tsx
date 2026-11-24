import { type ExerciseDto, exerciseSchema } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useParams } from "react-router";

import { ErrorState, LoadingState } from "@/components/app/data-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { exercisesKey, usePreview, useQuestions } from "@/lib/authoring";
import { useExercise } from "@/lib/exercise-query";

export function ExerciseEditorPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<"single_choice" | "multi_select" | "free_text">("single_choice");
  const [prompt, setPrompt] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [correctA, setCorrectA] = useState(false);
  const [correctB, setCorrectB] = useState(false);
  const [modelAnswer, setModelAnswer] = useState("");
  const [aliases, setAliases] = useState("");

  const exercise = useExercise(id);
  const questions = useQuestions(id);
  const preview = usePreview(id);
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["teacher", "exercises", id] });

  const createQuestion = useMutation({
    mutationFn: () => {
      const body =
        kind === "free_text"
          ? {
              kind,
              prompt,
              modelAnswer,
              aliases: aliases
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            }
          : {
              kind,
              prompt,
              options: [
                { id: "a", text: optionA },
                { id: "b", text: optionB },
              ],
              ...(kind === "single_choice"
                ? { correctOptionId: correctA ? "a" : "b" }
                : { correctOptionIds: [correctA ? "a" : "b", correctB ? "b" : "a"] }),
            };
      return apiRequest(`/teacher/exercises/${id}/questions`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: invalidate,
  });

  const patchExercise = useMutation({
    mutationFn: (body: string) =>
      apiRequest(`/teacher/exercises/${id}`, { method: "PATCH", body }, exerciseSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exercisesKey });
      void queryClient.invalidateQueries({ queryKey: ["teacher", "exercises", id] });
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    createQuestion.mutate();
    setPrompt("");
    setModelAnswer("");
    setAliases("");
  }

  function onDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    patchExercise.mutate(
      JSON.stringify({
        title: data.get("title"),
        verdictVisibility: data.get("verdictVisibility"),
        speedWindowSeconds: Number(data.get("speedWindowSeconds")),
        weightCorrect: Number(data.get("weightCorrect")),
        weightSpeed: Number(data.get("weightSpeed")),
      }),
    );
  }

  if (exercise.isPending) return <LoadingState label="Loading exercise" />;
  if (exercise.isError) {
    return (
      <ErrorState message="Could not load the exercise." onRetry={() => void exercise.refetch()} />
    );
  }
  const current: ExerciseDto = exercise.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{current.title}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {current.type} · {current.status} · verdicts {current.verdictVisibility}
        </p>
      </div>

      <form onSubmit={onDetails} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input id="edit-title" name="title" defaultValue={current.title} dir="auto" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-verdict">Verdict visibility</Label>
          <select
            id="edit-verdict"
            name="verdictVisibility"
            defaultValue={current.verdictVisibility}
            className="h-9 rounded-input border border-hairline bg-surface px-3 text-sm"
          >
            <option value="immediate">Immediate</option>
            <option value="at_close">At close</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-window">Speed window (s)</Label>
          <Input
            id="edit-window"
            name="speedWindowSeconds"
            type="number"
            min={1}
            defaultValue={current.speedWindowSeconds}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-correct">Weight correct</Label>
          <Input
            id="edit-correct"
            name="weightCorrect"
            type="number"
            step="0.05"
            min={0}
            max={1}
            defaultValue={current.weightCorrect}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-speed">Weight speed</Label>
          <Input
            id="edit-speed"
            name="weightSpeed"
            type="number"
            step="0.05"
            min={0}
            max={1}
            defaultValue={current.weightSpeed}
          />
        </div>
        <Button type="submit" className="sm:col-span-2 lg:col-span-5">
          Save details
        </Button>
      </form>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-ink">Questions</h2>
        {questions.data?.length ? (
          <ol className="space-y-2">
            {questions.data.map((question, index) => (
              <li
                key={question.id}
                className="rounded-card border border-hairline bg-surface p-4 text-sm"
              >
                <span className="mr-2 text-ink-muted">{index + 1}.</span>
                <span dir="auto">{question.prompt}</span>
                <span className="ml-2 rounded-input bg-muted px-2 py-0.5 text-xs text-ink-muted">
                  {question.kind} · {question.points} pts
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-muted">No questions yet.</p>
        )}

        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-card border border-hairline bg-surface p-6 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="question-kind">Kind</Label>
            <select
              id="question-kind"
              className="h-9 rounded-input border border-hairline bg-surface px-3 text-sm"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as "single_choice" | "multi_select" | "free_text")
              }
            >
              <option value="single_choice">Single choice</option>
              <option value="multi_select">Multi select</option>
              <option value="free_text">Free text</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="question-prompt">Prompt</Label>
            <Input
              id="question-prompt"
              dir="auto"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              required
            />
          </div>
          {kind !== "free_text" ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="option-a">Option A</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="option-a"
                    value={optionA}
                    onChange={(event) => setOptionA(event.target.value)}
                    required
                  />
                  <input
                    type="checkbox"
                    checked={correctA}
                    onChange={(event) => setCorrectA(event.target.checked)}
                    aria-label="Option A correct"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="option-b">Option B</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="option-b"
                    value={optionB}
                    onChange={(event) => setOptionB(event.target.value)}
                    required
                  />
                  <input
                    type="checkbox"
                    checked={correctB}
                    onChange={(event) => setCorrectB(event.target.checked)}
                    aria-label="Option B correct"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="model-answer">Model answer</Label>
                <Input
                  id="model-answer"
                  dir="auto"
                  value={modelAnswer}
                  onChange={(event) => setModelAnswer(event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="aliases">Accepted aliases (one per line)</Label>
                <textarea
                  id="aliases"
                  dir="auto"
                  className="rounded-input border border-hairline bg-surface p-3 text-sm"
                  value={aliases}
                  onChange={(event) => setAliases(event.target.value)}
                  required
                />
              </div>
            </>
          )}
          <Button
            type="submit"
            className="sm:col-span-2"
            disabled={current.status !== "draft" || createQuestion.isPending}
          >
            Add question
          </Button>
          {current.status !== "draft" ? (
            <p className="text-xs text-ink-muted sm:col-span-2">
              Questions are locked outside draft.
            </p>
          ) : null}
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl text-ink">Student preview</h2>
          {preview.data?.ready ? (
            <span className="rounded-input bg-success/10 px-2 py-1 text-xs text-success">
              Ready for live
            </span>
          ) : (
            <span className="rounded-input bg-warning/10 px-2 py-1 text-xs text-warning">
              Not ready
            </span>
          )}
        </div>
        {preview.data?.issues.length ? (
          <ul className="list-disc pl-5 text-sm text-warning">
            {preview.data.issues.map((issue) => (
              <li key={`${issue.path.join(".")}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
        {preview.data?.questions.map((question) => (
          <div key={question.id} className="rounded-card border border-hairline bg-surface p-6">
            <p dir="auto" className="font-medium text-ink">
              {question.prompt}
            </p>
            {question.options?.map((option) => (
              <p key={option.id} className="mt-2 text-sm text-ink-muted">
                {option.text}
              </p>
            ))}
            {question.kind === "free_text" ? (
              <p className="mt-2 text-sm text-ink-muted">Typed answer</p>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
