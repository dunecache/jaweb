import type { Answer, Option } from "@jaweb/shared";

// Renders the student's own answer using the question's option labels. Choice
// ids are never shown as the answer when a human-readable label is available.
export function answerText(answer: Answer | null, options: Option[] | null): string {
  if (!answer) return "—";
  const labelOf = (id: string) => options?.find((option) => option.id === id)?.text ?? id;
  if (answer.kind === "free_text") return answer.text;
  if (answer.kind === "single_choice") return labelOf(answer.optionId);
  return answer.optionIds.map(labelOf).join(", ");
}
