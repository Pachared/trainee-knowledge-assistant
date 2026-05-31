import { describe, expect, it } from "vitest";
import { fitSummaryContextsToBudget } from "@/lib/rag/summary-context";

describe("fitSummaryContextsToBudget", () => {
  it("keeps small context unchanged", () => {
    const contexts = [
      {
        chunkId: "chunk-1",
        documentTitle: "เอกสาร",
        content: "เนื้อหาสั้น",
        score: 0
      }
    ];

    expect(fitSummaryContextsToBudget(contexts, 10_000)).toBe(contexts);
  });

  it("reduces oversized document contexts into ordered summary groups", () => {
    process.env.FULL_DOCUMENT_SUMMARY_BATCH_TOKENS = "120";
    const contexts = Array.from({ length: 8 }, (_, index) => ({
      chunkId: `chunk-${index + 1}`,
      documentTitle: "เอกสารยาว",
      content: `หัวข้อ ${index + 1} ${"document detail ".repeat(30)}`,
      score: 0
    }));

    const reduced = fitSummaryContextsToBudget(contexts, 150);

    expect(reduced.length).toBeLessThan(contexts.length);
    expect(reduced[0]?.content).toContain("สรุปย่อยกลุ่มที่ 1");
    expect(reduced.map((context) => context.content).join("\n")).toContain("หัวข้อ 1");

    process.env.FULL_DOCUMENT_SUMMARY_BATCH_TOKENS = "";
  });
});
