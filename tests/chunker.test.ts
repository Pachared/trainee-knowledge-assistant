import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/rag/chunker";

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
});
