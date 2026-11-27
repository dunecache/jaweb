// Answer drafts survive refresh, but must not survive a change of user on a
// shared classroom device (AGENTS §10/§12).
const DRAFT_PREFIX = "jaweb:draft:";

export function draftKey(questionId: string): string {
  return `${DRAFT_PREFIX}${questionId}`;
}

export function clearAnswerDrafts(): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(DRAFT_PREFIX)) localStorage.removeItem(key);
  }
}
