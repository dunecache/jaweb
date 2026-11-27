import type { PatchQuestionRequest, QuestionDto } from "@jaweb/shared";
import { useState } from "react";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditOption = { id: string; text: string; correct: boolean };

// Ids stay with their option when siblings are removed, so the answer key stays valid.
function nextOptionId(options: EditOption[]): string {
  const used = new Set(options.map((option) => option.id));
  for (let index = 0; index < 26; index += 1) {
    const id = String.fromCharCode(97 + index);
    if (!used.has(id)) return id;
  }
  return `option-${options.length + 1}`;
}

function EditQuestionDialog({
  question,
  disabled,
  onSave,
}: {
  question: QuestionDto;
  disabled: boolean;
  onSave: (body: PatchQuestionRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [points, setPoints] = useState(String(question.points));
  const [options, setOptions] = useState<EditOption[]>(() =>
    (question.options ?? []).map((option) => ({
      id: option.id,
      text: option.text,
      correct: question.correctOptionIds?.includes(option.id) ?? false,
    })),
  );
  const [modelAnswer, setModelAnswer] = useState(question.modelAnswer ?? "");
  const [aliases, setAliases] = useState((question.aliases ?? []).join("\n"));
  const [keyPoints, setKeyPoints] = useState((question.keyPoints ?? []).join("\n"));
  const [partialCredit, setPartialCredit] = useState(question.partialCredit);

  const pointsValue = Number(points);
  const noCorrectOption =
    question.kind !== "free_text" && !options.some((option) => option.correct);
  const canSave =
    prompt.trim().length > 0 &&
    Number.isInteger(pointsValue) &&
    pointsValue >= 1 &&
    !noCorrectOption &&
    (question.kind === "free_text"
      ? modelAnswer.trim().length > 0 &&
        aliases
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean).length > 0
      : options.length >= 2 && options.every((option) => option.text.trim().length > 0));

  function toggleCorrect(optionId: string) {
    setOptions((current) =>
      question.kind === "single_choice"
        ? current.map((option) => ({ ...option, correct: option.id === optionId }))
        : current.map((option) =>
            option.id === optionId ? { ...option, correct: !option.correct } : option,
          ),
    );
  }

  function addOption() {
    setOptions((current) => [...current, { id: nextOptionId(current), text: "", correct: false }]);
  }

  function removeOption(optionId: string) {
    setOptions((current) => {
      if (current.length <= 2) return current;
      const next = current.filter((option) => option.id !== optionId);
      if (!next.some((option) => option.correct)) {
        return next.map((option, index) => (index === 0 ? { ...option, correct: true } : option));
      }
      return next;
    });
  }

  function save() {
    if (!canSave) return;
    const body: PatchQuestionRequest = { prompt: prompt.trim(), points: pointsValue };
    if (question.kind === "single_choice") {
      body.options = options.map(({ id, text }) => ({ id, text: text.trim() }));
      body.correctOptionId = options.find((option) => option.correct)?.id ?? options[0]?.id ?? "a";
    } else if (question.kind === "multi_select") {
      body.options = options.map(({ id, text }) => ({ id, text: text.trim() }));
      body.correctOptionIds = options.filter((option) => option.correct).map((option) => option.id);
      body.partialCredit = partialCredit;
    } else {
      body.modelAnswer = modelAnswer.trim();
      body.keyPoints = keyPoints
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      body.aliases = aliases
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    onSave(body);
    setOpen(false);
  }

  const suffix = question.id;
  return (
    <>
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Edit question</DialogTitle>
            <DialogDescription>
              Questions are editable while the exercise is a draft.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`prompt-${suffix}`}>Prompt</Label>
              <Input
                id={`prompt-${suffix}`}
                dir="auto"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`points-${suffix}`}>Points</Label>
              <Input
                id={`points-${suffix}`}
                type="number"
                min={1}
                value={points}
                onChange={(event) => setPoints(event.target.value)}
              />
            </div>
            {question.kind === "free_text" ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`answer-${suffix}`}>Model answer</Label>
                  <Input
                    id={`answer-${suffix}`}
                    dir="auto"
                    value={modelAnswer}
                    onChange={(event) => setModelAnswer(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`key-points-${suffix}`}>Key points (one per line)</Label>
                  <textarea
                    id={`key-points-${suffix}`}
                    dir="auto"
                    className="rounded-md border border-border bg-card p-3 text-sm"
                    value={keyPoints}
                    onChange={(event) => setKeyPoints(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`aliases-${suffix}`}>Accepted aliases (one per line)</Label>
                  <textarea
                    id={`aliases-${suffix}`}
                    dir="auto"
                    className="rounded-md border border-border bg-card p-3 text-sm"
                    value={aliases}
                    onChange={(event) => setAliases(event.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                {options.map((option) => (
                  <div key={option.id} className="flex flex-col gap-2">
                    <Label htmlFor={`option-${option.id}-${suffix}`}>
                      Option {option.id.toUpperCase()}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`option-${option.id}-${suffix}`}
                        dir="auto"
                        value={option.text}
                        onChange={(event) => {
                          const value = event.target.value;
                          setOptions((current) =>
                            current.map((item) =>
                              item.id === option.id ? { ...item, text: value } : item,
                            ),
                          );
                        }}
                      />
                      {question.kind === "single_choice" ? (
                        <input
                          type="radio"
                          name={`correct-${suffix}`}
                          aria-label={`Option ${option.id.toUpperCase()} correct`}
                          checked={option.correct}
                          onChange={() => toggleCorrect(option.id)}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          aria-label={`Option ${option.id.toUpperCase()} correct`}
                          checked={option.correct}
                          onChange={() => toggleCorrect(option.id)}
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
                  </div>
                ))}
                <div>
                  <Button type="button" size="sm" variant="outline" onClick={addOption}>
                    Add option
                  </Button>
                </div>
                {question.kind === "multi_select" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={partialCredit}
                      onChange={(event) => setPartialCredit(event.target.checked)}
                    />
                    Allow partial credit
                  </label>
                ) : null}
                {noCorrectOption ? (
                  <p className="text-xs text-amber-700">Mark at least one correct option.</p>
                ) : null}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!canSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function QuestionList({
  questions,
  editable,
  onEdit,
  onDelete,
}: {
  questions: QuestionDto[];
  editable: boolean;
  onEdit: (id: string, body: PatchQuestionRequest) => void;
  onDelete: (id: string) => void;
}) {
  if (!questions.length) {
    return <p className="text-sm text-muted-foreground">No questions yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {questions.map((question, index) => (
        <li
          key={question.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm"
        >
          <div>
            <span className="mr-2 text-muted-foreground">{index + 1}.</span>
            <span dir="auto">{question.prompt}</span>
            <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {question.kind} · {question.points} pts
            </span>
          </div>
          <div className="flex gap-2">
            <EditQuestionDialog
              question={question}
              disabled={!editable}
              onSave={(body) => onEdit(question.id, body)}
            />
            <ConfirmButton
              label="Delete"
              title="Delete question?"
              description="This removes the question from the draft."
              confirmLabel="Delete"
              destructive
              disabled={!editable}
              onConfirm={() => onDelete(question.id)}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
