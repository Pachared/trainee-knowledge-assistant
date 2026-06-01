export function computeDocumentRetryDelayMs(attempts: number) {
  const baseMs = 1_000;
  const maxMs = 300_000;
  const exponent = Math.max(0, attempts);

  return Math.min(maxMs, baseMs * 2 ** exponent);
}

export function isDocumentJobExpired(lockedAt: Date | null, now = new Date(), timeoutMs = 5 * 60_000) {
  if (!lockedAt) {
    return true;
  }

  return now.getTime() - lockedAt.getTime() > timeoutMs;
}
