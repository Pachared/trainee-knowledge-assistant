import { describe, expect, it } from "vitest";
import { computeDocumentRetryDelayMs, isDocumentJobExpired } from "@/lib/documents/document-job";

describe("document job retry policy", () => {
  it("uses exponential backoff with a maximum cap", () => {
    expect(computeDocumentRetryDelayMs(0)).toBe(1_000);
    expect(computeDocumentRetryDelayMs(1)).toBe(2_000);
    expect(computeDocumentRetryDelayMs(5)).toBe(32_000);
    expect(computeDocumentRetryDelayMs(20)).toBe(300_000);
  });

  it("treats stale processing jobs as expired", () => {
    const now = new Date("2026-06-01T10:00:00.000Z");
    const stale = new Date("2026-06-01T09:54:59.999Z");
    const fresh = new Date("2026-06-01T09:58:00.000Z");

    expect(isDocumentJobExpired(stale, now, 5 * 60_000)).toBe(true);
    expect(isDocumentJobExpired(fresh, now, 5 * 60_000)).toBe(false);
    expect(isDocumentJobExpired(null, now, 5 * 60_000)).toBe(true);
  });
});
