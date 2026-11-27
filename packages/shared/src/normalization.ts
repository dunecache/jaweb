// One normalization function, applied to student answers and stored aliases alike
// (AGENTS §9.3). Order matters: diacritics first, then letter unification.
const ARABIC_TASHKEEL = /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g;
const TATWEEL = /\u0640/g;
const PUNCTUATION = /[.,!?;:،؛«»…()[\]{}"'…]/g;

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // French accents: é è ê à ç → e e e a c
    .replace(ARABIC_TASHKEEL, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا") // alef forms
    .replace(/ة/g, "ه") // ta marbuta
    .replace(/ى/g, "ي") // alef maqsura
    .replace(PUNCTUATION, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function aliasesMatch(answer: string, aliases: readonly string[]): boolean {
  const normalized = normalizeText(answer);
  if (!normalized) return false;
  return aliases.some((alias) => normalizeText(alias) === normalized);
}
