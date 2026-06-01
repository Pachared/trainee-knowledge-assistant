import { describe, expect, it } from "vitest";
import { buildAssistantPrompt } from "@/lib/ai/assistant-service";

describe("buildAssistantPrompt", () => {
  it("adds comprehensive summary instructions for whole-document summary mode", () => {
    const prompt = buildAssistantPrompt({
      message: "ช่วยสรุปเอกสารนี้แบบละเอียด",
      history: [],
      summaryMode: "comprehensive",
      contexts: [
        {
          chunkId: "chunk-1",
          documentTitle: "เอกสารทดสอบ",
          content: "ส่วนที่หนึ่ง",
          score: 0
        }
      ]
    });

    expect(prompt).toContain("สรุปแบบละเอียดและครอบคลุมทุกส่วน");
    expect(prompt).toContain("ห้ามข้ามรายละเอียดสำคัญ");
    expect(prompt).toContain("ข้อจำกัดหรือสิ่งที่ยังไม่ชัดเจน");
  });

  it("uses a readable summary template instead of brief or chunk-dump instructions", () => {
    const prompt = buildAssistantPrompt({
      message: "ช่วยสรุปเอกสารนี้ทั้งหมดให้อ่านเข้าใจง่าย",
      history: [],
      summaryMode: "comprehensive",
      contexts: [
        {
          chunkId: "chunk-1",
          documentTitle: "เอกสารทดสอบ",
          content: "ส่วนที่ 1: รายละเอียดดิบจาก chunk",
          score: 0
        }
      ]
    });

    expect(prompt).toContain("รูปแบบคำตอบที่ต้องใช้");
    expect(prompt).toContain("## ภาพรวม");
    expect(prompt).toContain("## รายละเอียดตามลำดับเอกสาร");
    expect(prompt).toContain("รวม chunks ที่พูดเรื่องเดียวกันให้เป็นหัวข้อเดียว");
    expect(prompt).not.toContain("ตอบเป็นภาษาไทยให้กระชับ");
  });
});
