export const DOCUMENT_SUMMARY_PROMPT = "ช่วยสรุปเอกสารนี้ทั้งหมดแบบละเอียด เป็นระบบ และอ่านเข้าใจง่าย";

export function canSummarizeDocument(documentId?: string) {
  return Boolean(documentId);
}
