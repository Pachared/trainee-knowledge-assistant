const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/g;
const WORD_REGEX = /[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g;

export function estimateTokens(text: string): number {
  const normalized = text.trim();

  if (!normalized) {
    return 0;
  }

  const thaiChars = normalized.match(THAI_CHAR_REGEX)?.length ?? 0;
  const nonThai = normalized.replace(THAI_CHAR_REGEX, " ");
  const wordishUnits = nonThai.match(WORD_REGEX)?.length ?? 0;

  return Math.max(1, Math.ceil(thaiChars / 3) + Math.ceil(wordishUnits * 0.75));
}
