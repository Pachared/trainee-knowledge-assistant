import { describe, expect, it } from "vitest";
import { chunkText, chunkTextPages } from "@/lib/rag/chunker";

describe("chunkText", () => {
  it("creates overlapping chunks that preserve source order", () => {
    const text = Array.from({ length: 90 }, (_, index) => `คำ${index}`).join(" ");

    const chunks = chunkText(text, { maxChars: 120, overlapChars: 24 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.index).toBe(0);
    expect(chunks[1]?.index).toBe(1);
    expect(chunks.map((chunk) => chunk.content.trim())).not.toContain("");
    expect(chunks[1]?.content).toContain("คำ");
  });

  it("returns an empty array for blank input", () => {
    expect(chunkText(" \n\t ")).toEqual([]);
  });

  it("preserves page number metadata when chunking pages", () => {
    const chunks = chunkTextPages([
      { pageNumber: 1, text: "หน้าแรกมีเนื้อหาเกี่ยวกับระบบ RAG และ upload" },
      { pageNumber: 2, text: "หน้าสองมีเนื้อหาเกี่ยวกับ citation และ diagnostics" }
    ]);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ index: 0, pageNumber: 1 });
    expect(chunks[1]).toMatchObject({ index: 1, pageNumber: 2 });
  });
});
