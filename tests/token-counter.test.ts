import { describe, expect, it } from "vitest";
import { estimateTokens } from "@/lib/ai/tokenizer";

describe("estimateTokens", () => {
  it("counts Thai and English text with a non-zero lower bound", () => {
    expect(estimateTokens("สวัสดีครับ hello world")).toBeGreaterThan(0);
  });

  it("returns zero for empty text", () => {
    expect(estimateTokens("")).toBe(0);
  });
});
