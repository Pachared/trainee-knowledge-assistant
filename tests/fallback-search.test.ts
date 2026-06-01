import { describe, expect, it } from "vitest";
import { rankFallbackChunks } from "@/lib/rag/fallback-search";

describe("rankFallbackChunks", () => {
  const chunks = [
    {
      id: "a",
      content: "invoice payment apple banana",
      chunkIndex: 0,
      pageNumber: 1,
      document: { id: "doc-a", title: "Billing" }
    },
    {
      id: "b",
      content: "apple apple apple payment due date",
      chunkIndex: 1,
      pageNumber: 2,
      document: { id: "doc-b", title: "Invoice apple" }
    },
    {
      id: "c",
      content: "unrelated project timeline",
      chunkIndex: 2,
      pageNumber: null,
      document: { id: "doc-c", title: "Project" }
    }
  ];

  it("ranks by query term relevance instead of first keyword only", () => {
    const ranked = rankFallbackChunks(chunks, "apple payment", 2);

    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.chunkId).toBe("b");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it("returns a bounded set even when no term matches", () => {
    const ranked = rankFallbackChunks(chunks, "missing", 2);

    expect(ranked).toHaveLength(2);
    expect(ranked.every((item) => item.score === 0)).toBe(true);
  });
});
