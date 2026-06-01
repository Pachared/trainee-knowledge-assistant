import type { ApiDocument } from "@/components/app/types";

type StatusSeverity = "info" | "success" | "warning" | "error";

export type DocumentStatusMeta = {
  label: string;
  stepLabel: string;
  helperText: string;
  nextStep: string;
  progress: number;
  severity: StatusSeverity;
  canUseForChat: boolean;
  canUseForSummary: boolean;
};

function reasonAdvice(document: Pick<ApiDocument, "status" | "failedReason">) {
  const reason = (document.failedReason ?? "").toLowerCase();

  if (reason.includes("pdf") || reason.includes("parse")) {
    return "ลอง export PDF ใหม่ หรืออัปโหลดเป็น TXT ถ้าไฟล์ PDF ถูกสแกนเป็นรูปภาพ";
  }

  if (reason.includes("chroma")) {
    return "ยังถามจากข้อมูลสำรองได้ แต่ควรกดสร้างดัชนีใหม่เพื่อให้ RAG แม่นขึ้น";
  }

  if (reason.includes("openai") || reason.includes("embedding")) {
    return "ตรวจ OPENAI_API_KEY, quota และ diagnostics แล้วกดสร้างดัชนีใหม่";
  }

  if (reason.includes("ไฟล์ใหญ่")) {
    return "ลดขนาดไฟล์ หรือเพิ่ม MAX_UPLOAD_MB ใน env";
  }

  return document.status === "failed" ? "ตรวจเหตุผลด้านล่าง แก้ไฟล์ แล้วอัปโหลดใหม่อีกครั้ง" : "กดสร้างดัชนีใหม่ได้ถ้าต้องการซ่อม Chroma";
}

function stageLabel(stage?: string | null) {
  const labels: Record<string, string> = {
    queued: "รับไฟล์แล้ว",
    retry_waiting: "รอ retry",
    starting: "เริ่มประมวลผล",
    extracting: "กำลังอ่านข้อความจากไฟล์",
    chunking: "กำลังแบ่งเนื้อหาเป็น chunks",
    saving_chunks: "กำลังบันทึก chunks ลงฐานข้อมูล",
    summarizing: "กำลังสร้าง summary cache",
    embedding: "กำลังสร้าง embeddings และส่งเข้า Chroma",
    reindexing_chroma: "กำลังสร้างดัชนี Chroma ใหม่",
    fallback_ready: "พร้อมใช้ผ่าน SQLite fallback",
    ready: "พร้อมใช้งาน",
    failed: "ประมวลผลไม่สำเร็จ"
  };

  return stage ? labels[stage] ?? stage : undefined;
}

export function getDocumentStatusMeta(
  document: Pick<ApiDocument, "status" | "failedReason" | "_count" | "jobStage" | "jobProgress">
): DocumentStatusMeta {
  const chunks = document._count?.chunks ?? 0;
  const progress = typeof document.jobProgress === "number" ? document.jobProgress : undefined;
  const currentStage = stageLabel(document.jobStage);

  if (document.status === "ready") {
    return {
      label: "พร้อมใช้งาน",
      stepLabel: currentStage ? `ขั้นตอน 4/4: ${currentStage}` : "ขั้นตอน 4/4: พร้อมถามและสรุป",
      helperText: `อ่านเอกสารแล้ว ${chunks.toLocaleString()} chunks และสร้างดัชนี Chroma สำเร็จ`,
      nextStep: "เลือกเอกสารนี้ในหน้าแชทเพื่อถามหรือสรุปได้ทันที",
      progress: progress ?? 100,
      severity: "success",
      canUseForChat: true,
      canUseForSummary: chunks > 0
    };
  }

  if (document.status === "ready_without_chroma") {
    return {
      label: "พร้อมใช้แบบสำรอง",
      stepLabel: currentStage ? `ขั้นตอน 4/4: ${currentStage}` : "ขั้นตอน 4/4: ใช้ SQLite fallback",
      helperText: `อ่านเอกสารแล้ว ${chunks.toLocaleString()} chunks แต่ Chroma ยัง index ไม่สำเร็จ`,
      nextStep: reasonAdvice(document),
      progress: progress ?? 88,
      severity: "warning",
      canUseForChat: chunks > 0,
      canUseForSummary: chunks > 0
    };
  }

  if (document.status === "processing") {
    return {
      label: "กำลังประมวลผล",
      stepLabel: currentStage ? `กำลังทำงาน: ${currentStage}` : "ขั้นตอน 2/4: อ่านไฟล์และแบ่งเนื้อหา",
      helperText: "worker กำลังอ่านข้อความ แบ่ง chunks สร้าง summary และเตรียมส่งเข้า Chroma",
      nextStep: "รอสักครู่ หน้านี้จะอัปเดตสถานะให้อัตโนมัติ",
      progress: progress ?? 56,
      severity: "info",
      canUseForChat: false,
      canUseForSummary: false
    };
  }

  if (document.status === "queued") {
    return {
      label: "รอประมวลผล",
      stepLabel: currentStage ? `ขั้นตอน 1/4: ${currentStage}` : "ขั้นตอน 1/4: รับไฟล์แล้ว",
      helperText: "ไฟล์ถูกบันทึกแล้วและกำลังรอ worker เริ่มอ่านเอกสาร",
      nextStep: "ไม่ต้องกดซ้ำ ระบบจะเปลี่ยนเป็นกำลังประมวลผลเอง",
      progress: progress ?? 25,
      severity: "info",
      canUseForChat: false,
      canUseForSummary: false
    };
  }

  if (document.status === "failed") {
    return {
      label: "อ่านไฟล์ไม่สำเร็จ",
      stepLabel: currentStage ? `หยุดที่ขั้นตอน: ${currentStage}` : "หยุดที่ขั้นตอนประมวลผลเอกสาร",
      helperText: document.failedReason || "ระบบอ่านเอกสารนี้ไม่สำเร็จ",
      nextStep: reasonAdvice(document),
      progress: progress ?? 100,
      severity: "error",
      canUseForChat: false,
      canUseForSummary: false
    };
  }

  return {
    label: document.status,
    stepLabel: "สถานะไม่รู้จัก",
    helperText: "ระบบพบสถานะที่ยังไม่มีคำอธิบายบน UI",
    nextStep: "ลอง refresh หรือเปิดหน้า diagnostics เพื่อตรวจระบบ",
    progress: 0,
    severity: "warning",
    canUseForChat: false,
    canUseForSummary: false
  };
}

export function getReadyDocuments(documents: ApiDocument[]) {
  return documents.filter((document) => getDocumentStatusMeta(document).canUseForChat);
}
