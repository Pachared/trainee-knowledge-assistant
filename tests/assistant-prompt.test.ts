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
});
