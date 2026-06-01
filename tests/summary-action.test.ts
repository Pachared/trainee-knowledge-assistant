import { describe, expect, it } from "vitest";
import { canSummarizeDocument, DOCUMENT_SUMMARY_PROMPT } from "@/components/chat/summary-action";

describe("document summary action", () => {
  it("requires a selected document before summary can run", () => {
    expect(canSummarizeDocument()).toBe(false);
    expect(canSummarizeDocument("")).toBe(false);
    expect(canSummarizeDocument("doc-1")).toBe(true);
  });

  it("uses a whole-document comprehensive summary prompt", () => {
    expect(DOCUMENT_SUMMARY_PROMPT).toContain("เอกสารนี้ทั้งหมด");
    expect(DOCUMENT_SUMMARY_PROMPT).toContain("ละเอียด");
    expect(DOCUMENT_SUMMARY_PROMPT).toContain("อ่านเข้าใจง่าย");
  });
});
