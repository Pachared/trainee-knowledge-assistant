import { describe, expect, it } from "vitest";
import { buildExtractiveDocumentSummary, hashSummarySource } from "@/lib/rag/document-summary";

describe("document summary cache helpers", () => {
  it("builds a compact ordered extractive summary from chunks", () => {
    const summary = buildExtractiveDocumentSummary(
      [
        { chunkIndex: 0, content: "บทนำของเอกสารเกี่ยวกับระบบ RAG และการค้นคืนข้อมูล" },
        { chunkIndex: 1, content: "รายละเอียดการ upload เอกสารและ indexing ด้วย Chroma" },
        { chunkIndex: 2, content: "สรุปท้ายเอกสารเกี่ยวกับ citation และ token usage" }
      ],
      "คู่มือระบบ"
    );

    expect(summary).toContain("คู่มือระบบ");
    expect(summary).toContain("ส่วนที่ 1");
    expect(summary).toContain("ส่วนที่ 3");
    expect(summary.length).toBeLessThan(1_500);
  });

  it("covers every chunk instead of sampling only a few sections", () => {
    const chunks = Array.from({ length: 20 }, (_, index) => ({
      chunkIndex: index,
      content: `รายละเอียดเฉพาะส่วน ${index + 1} ที่ต้องไม่หายไปจาก summary`
    }));

    const summary = buildExtractiveDocumentSummary(chunks, "เอกสารยาว");

    expect(summary).toContain("ครอบคลุม 20 chunks");
    expect(summary).toContain("ส่วนที่ 1");
    expect(summary).toContain("ส่วนที่ 20");
    expect(summary).toContain("รายละเอียดเฉพาะส่วน 20");
  });

  it("groups long documents into readable hierarchical sections", () => {
    const chunks = Array.from({ length: 18 }, (_, index) => ({
      chunkIndex: index,
      pageNumber: Math.floor(index / 3) + 1,
      content: `หัวข้อย่อย ${index + 1} มีรายละเอียดสำคัญและเงื่อนไขที่ต้องเก็บไว้ในสรุป`
    }));

    const summary = buildExtractiveDocumentSummary(chunks, "คู่มือยาว");

    expect(summary).toContain("## ภาพรวมเอกสาร");
    expect(summary).toContain("## รายละเอียดตามช่วงเอกสาร");
    expect(summary).toContain("ช่วงที่ 1");
    expect(summary).toContain("หน้า 1-3");
    expect(summary).toContain("ช่วงที่ 3");
    expect(summary).toContain("หัวข้อย่อย 18");
  });

  it("hashes source chunks deterministically", () => {
    const source = [{ chunkIndex: 0, content: "abc" }];

    expect(hashSummarySource(source)).toBe(hashSummarySource(source));
    expect(hashSummarySource(source)).not.toBe(hashSummarySource([{ chunkIndex: 0, content: "xyz" }]));
  });
});
