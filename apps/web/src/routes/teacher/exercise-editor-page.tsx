import {
  type CreateQuestionRequest,
  type ExerciseDto,
  exerciseSchema,
  type PatchQuestionRequest,
} from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/app/data-state";
import { QuestionList } from "@/components/app/question-list";
import { useToast } from "@/components/app/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/api";
import { exercisesKey, usePreview, useQuestions } from "@/lib/authoring";
import { useExercise } from "@/lib/exercise-query";

type QuestionKind = "single_choice" | "multi_select" | "free_text";
type DraftOption = { id: string; text: string; correct: boolean };

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.envelope.error.message : fallback;
}

// datetime-local needs local wall-clock components; toISOString() would shift the time.
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toUtcIso(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Ids stick to their option when siblings are removed, so the answer key stays valid.
function nextOptionId(options: DraftOption[]): string {
  const used = new Set(options.map((option) => option.id));
  for (let index = 0; index < 26; index += 1) {
    const id = String.fromCharCode(97 + index);
    if (!used.has(id)) return id;
  }
  return `option-${options.length + 1}`;
}

function blankOptions(): DraftOption[] {
  return [
    { id: "a", text: "", correct: true },
    { id: "b", text: "", correct: false },
  ];
}

export function ExerciseEditorPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [kind, setKind] = useState<QuestionKind>("single_choice");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<DraftOption[]>(blankOptions);
  const [points, setPoints] = useState("10");
  const [modelAnswer, setModelAnswer] = useState("");
  const [aliases, setAliases] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [partialCredit, setPartialCredit] = useState(false);

  const exercise = useExercise(id);
  const questions = useQuestions(id);
  const preview = usePreview(id);
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["teacher", "exercises", id] });

  function resetQuestionForm() {
    setPrompt("");
    setOptions(blankOptions());
    setPoints("10");
    setModelAnswer("");
    setAliases("");
    setKeyPoints("");
    setPartialCredit(false);
  }

  const createQuestion = useMutation({
    mutationFn: (body: CreateQuestionRequest) =>
      apiRequest(`/teacher/exercises/${id}/questions`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidate();
      resetQuestionForm();
    },
    onError: (error) => toast(messageOf(error, "Could not add the question.")),
  });

  const editQuestion = useMutation({
    mutationFn: ({ questionId, body }: { questionId: string; body: PatchQuestionRequest }) =>
      apiRequest(`/teacher/questions/${questionId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
    onError: (error) => toast(messageOf(error, "Could not update the question.")),
  });
  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) =>
      apiRequest(`/teacher/questions/${questionId}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (error) => toast(messageOf(error, "Could not delete the question.")),
  });
  const lifecycle = useMutation({
    mutationFn: (action: "live" | "close") =>
      apiRequest(`/teacher/exercises/${id}/${action}`, { method: "POST" }),
    onSuccess: invalidate,
    onError: (error) => toast(messageOf(error, "Could not update the exercise.")),
  });

  const patchExercise = useMutation({
    mutationFn: (body: string) =>
      apiRequest(`/teacher/exercises/${id}`, { method: "PATCH", body }, exerciseSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exercisesKey });
      void queryClient.invalidateQueries({ queryKey: ["teacher", "exercises", id] });
    },
    onError: (error) => toast(messageOf(error, "Could not save the exercise details.")),
  });

  if (exercise.isPending) return <LoadingState label="Loading exercise" />;
  if (exercise.isError) {
    return (
      <ErrorState message="Could not load the exercise." onRetry={() => void exercise.refetch()} />
    );
  }
  const current: ExerciseDto = exercise.data;
  const detailsLocked = current.status === "live" || current.status === "closed";

  function changeKind(value: QuestionKind) {
    setKind(value);
    if (value === "single_choice") {
      setOptions((currentOptions) => {
        const firstCorrect = currentOptions.findIndex((option) => option.correct);
        const keep = firstCorrect === -1 ? 0 : firstCorrect;
        return currentOptions.map((option, index) => ({ ...option, correct: index === keep }));
      });
    }
  }

  function toggleCorrect(optionId: string) {
    setOptions((currentOptions) =>
      kind === "single_choice"
        ? currentOptions.map((option) => ({ ...option, correct: option.id === optionId }))
        : currentOptions.map((option) =>
            option.id === optionId ? { ...option, correct: !option.correct } : option,
          ),
    );
  }

  function addOption() {
    setOptions((currentOptions) => [
      ...currentOptions,
      { id: nextOptionId(currentOptions), text: "", correct: false },
    ]);
  }

  function removeOption(optionId: string) {
    setOptions((currentOptions) => {
      if (currentOptions.length <= 2) return currentOptions;
      const next = currentOptions.filter((option) => option.id !== optionId);
      if (!next.some((option) => option.correct)) {
        return next.map((option, index) => (index === 0 ? { ...option, correct: true } : option));
      }
      return next;
    });
  }

  const pointsValue = Number(points);
  const aliasList = aliases
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const keyPointList = keyPoints
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const choicesValid =
    kind === "free_text" ||
    (options.length >= 2 &&
      options.every((option) => option.text.trim().length > 0) &&
      options.some((option) => option.correct));
  const textValid = kind !== "free_text" || (modelAnswer.trim().length > 0 && aliasList.length > 0);
  const canSubmit =
    current.status === "draft" &&
    !createQuestion.isPending &&
    prompt.trim().length > 0 &&
    Number.isInteger(pointsValue) &&
    pointsValue >= 1 &&
    choicesValid &&
    textValid;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    const base = { prompt: prompt.trim(), points: pointsValue };
    const body: CreateQuestionRequest =
      kind === "free_text"
        ? {
            ...base,
            kind,
            modelAnswer: modelAnswer.trim(),
            keyPoints: keyPointList,
            aliases: aliasList,
          }
        : kind === "single_choice"
          ? {
              ...base,
              kind,
              options: options.map(({ id: optionId, text }) => ({
                id: optionId,
                text: text.trim(),
              })),
              correctOptionId:
                options.find((option) => option.correct)?.id ?? options[0]?.id ?? "a",
            }
          : {
              ...base,
              kind,
              options: options.map(({ id: optionId, text }) => ({
                id: optionId,
                text: text.trim(),
              })),
              correctOptionIds: options
                .filter((option) => option.correct)
                .map((option) => option.id),
              partialCredit,
            };
    createQuestion.mutate(body);
  }

  function onDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (detailsLocked) return;
    const data = new FormData(event.currentTarget);
    patchExercise.mutate(
      JSON.stringify({
        title: data.get("title"),
        verdictVisibility: data.get("verdictVisibility"),
        opensAt: toUtcIso(data.get("opensAt")),
        closesAt: toUtcIso(data.get("closesAt")),
      }),
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">{current.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {current.type} · {current.status} · verdicts {current.verdictVisibility}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/teacher/exercises/${id}/monitor`}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            Monitor
          </Link>
          {current.status === "draft" || current.status === "scheduled" ? (
            <ConfirmButton
              variant="default"
              label="Go live"
              title="Start this exercise?"
              description="Students in its class will see it immediately."
              confirmLabel="Go live"
              onConfirm={() => lifecycle.mutate("live")}
            />
          ) : null}
          {current.status === "live" ? (
            <ConfirmButton
              variant="destructive"
              label="Close"
              title="Close this exercise?"
              description="Answers are locked and results are revealed."
              confirmLabel="Close"
              destructive
              onConfirm={() => lifecycle.mutate("close")}
            />
          ) : null}
        </div>
      </div>

      <form onSubmit={onDetails} className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            name="title"
            defaultValue={current.title}
            dir="auto"
            disabled={detailsLocked}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-verdict">Verdict visibility</Label>
          <select
            id="edit-verdict"
            name="verdictVisibility"
            defaultValue={current.verdictVisibility}
            disabled={detailsLocked}
            className="h-9 rounded-md border border-border bg-card px-3 text-sm disabled:opacity-60"
          >
            <option value="immediate">Immediate</option>
            <option value="at_close">At close</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-opens-at">Opens at (local time)</Label>
          <Input
            id="edit-opens-at"
            name="opensAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(current.opensAt)}
            disabled={detailsLocked}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-closes-at">Closes at (local time)</Label>
          <Input
            id="edit-closes-at"
            name="closesAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(current.closesAt)}
            disabled={detailsLocked}
          />
        </div>
        <Button type="submit" className="sm:col-span-2" disabled={detailsLocked}>
          Save details
        </Button>
        {detailsLocked ? (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Details are locked once the exercise is live or closed.
          </p>
        ) : null}
      </form>

      <section className="space-y-4">
        <h2 className="font-serif text-xl text-foreground">Questions</h2>
        <QuestionList
          questions={questions.data ?? []}
          editable={current.status === "draft"}
          onEdit={(questionId, body) => editQuestion.mutate({ questionId, body })}
          onDelete={(questionId) => deleteQuestion.mutate(questionId)}
        />

        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="question-kind">Kind</Label>
            <select
              id="question-kind"
              className="h-9 rounded-md border border-border bg-card px-3 text-sm"
              value={kind}
              onChange={(event) => changeKind(event.target.value as QuestionKind)}
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="question-points">Points</Label>
            <Input
              id="question-points"
              type="number"
              min={1}
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              required
            />
          </div>
          {kind !== "free_text" ? (
            <>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-foreground">Options</span>
                {options.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Input
                      aria-label={`Option ${option.id.toUpperCase()}`}
                      dir="auto"
                      value={option.text}
                      onChange={(event) => {
                        const value = event.target.value;
                        setOptions((currentOptions) =>
                          currentOptions.map((item) =>
                            item.id === option.id ? { ...item, text: value } : item,
                          ),
                        );
                      }}
                      required
                    />
                    {kind === "single_choice" ? (
                      <input
                        type="radio"
                        name="correct-option"
                        checked={option.correct}
                        onChange={() => toggleCorrect(option.id)}
                        aria-label={`Option ${option.id.toUpperCase()} correct`}
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={option.correct}
                        onChange={() => toggleCorrect(option.id)}
                        aria-label={`Option ${option.id.toUpperCase()} correct`}
                      />
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={options.length <= 2}
                      onClick={() => removeOption(option.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div>
                  <Button type="button" size="sm" variant="outline" onClick={addOption}>
                    Add option
                  </Button>
                </div>
                {!options.some((option) => option.correct) ? (
                  <p className="text-xs text-amber-700">Mark at least one correct option.</p>
                ) : null}
              </div>
              {kind === "multi_select" ? (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={partialCredit}
                    onChange={(event) => setPartialCredit(event.target.checked)}
                  />
                  Allow partial credit
                </label>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="model-answer">Model answer</Label>
                <Input
                  id="model-answer"
                  dir="auto"
                  value={modelAnswer}
                  onChange={(event) => setModelAnswer(event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="key-points">Key points (one per line)</Label>
                <textarea
                  id="key-points"
                  dir="auto"
                  className="rounded-md border border-border bg-card p-3 text-sm"
                  value={keyPoints}
                  onChange={(event) => setKeyPoints(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="aliases">Accepted aliases (one per line)</Label>
                <textarea
                  id="aliases"
                  dir="auto"
                  className="rounded-md border border-border bg-card p-3 text-sm"
                  value={aliases}
                  onChange={(event) => setAliases(event.target.value)}
                  required
                />
              </div>
            </>
          )}
          <Button type="submit" className="sm:col-span-2" disabled={!canSubmit}>
            Add question
          </Button>
          {current.status !== "draft" ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Questions are locked outside draft.
            </p>
          ) : null}
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl text-foreground">Student preview</h2>
          {preview.data?.ready ? (
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
              Ready for live
            </span>
          ) : (
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
              Not ready
            </span>
          )}
        </div>
        {preview.data?.issues.length ? (
          <ul className="list-disc pl-5 text-sm text-amber-700">
            {preview.data.issues.map((issue) => (
              <li key={`${issue.path.join(".")}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
        {preview.data?.questions.map((question) => (
          <div key={question.id} className="rounded-xl border border-border bg-card p-6">
            <p dir="auto" className="font-medium text-foreground">
              {question.prompt}
            </p>
            {question.options?.map((option) => (
              <p key={option.id} className="mt-2 text-sm text-muted-foreground">
                {option.text}
              </p>
            ))}
            {question.kind === "free_text" ? (
              <p className="mt-2 text-sm text-muted-foreground">Typed answer</p>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
