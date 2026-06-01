export type StatusFeedback = {
  severity: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  nextStep?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function getStatusFeedback(status?: string): StatusFeedback | null {
  if (!status) {
    return null;
  }

  const lower = status.toLowerCase();

  if (lower.includes("openai") || lower.includes("api key") || lower.includes("quota") || lower.includes("rate limit")) {
    return {
      severity: "error",
      title: "AI ยังตอบไม่ได้",
      message: status,
      nextStep: "เปิดหน้าตรวจระบบเพื่อดู OpenAI key, quota และ model ที่ตั้งค่าไว้",
      actionLabel: "เปิด Diagnostics",
      actionHref: "/admin"
    };
  }

  if (lower.includes("chroma") || lower.includes("re-index") || lower.includes("index")) {
    return {
      severity: lower.includes("ไม่สำเร็จ") || lower.includes("failed") ? "warning" : "success",
      title: lower.includes("ไม่สำเร็จ") || lower.includes("failed") ? "ดัชนีเอกสารยังไม่สมบูรณ์" : "อัปเดตดัชนีแล้ว",
      message: status,
      nextStep: lower.includes("ไม่สำเร็จ") || lower.includes("failed") ? "ยังถามจาก SQLite fallback ได้ แล้วลองกดสร้างดัชนีใหม่อีกครั้ง" : undefined,
      actionLabel: lower.includes("ไม่สำเร็จ") || lower.includes("failed") ? "ไปหน้าอัปโหลด" : undefined,
      actionHref: lower.includes("ไม่สำเร็จ") || lower.includes("failed") ? "/upload" : undefined
    };
  }

  if (lower.includes("อัปโหลด") || lower.includes("ประมวลผลเอกสาร")) {
    return {
      severity: lower.includes("ไม่สำเร็จ") ? "error" : "info",
      title: lower.includes("ไม่สำเร็จ") ? "อัปโหลดไม่สำเร็จ" : "รับไฟล์แล้ว",
      message: status,
      nextStep: lower.includes("ไม่สำเร็จ") ? "ตรวจชนิดไฟล์ ขนาดไฟล์ แล้วลองอัปโหลดอีกครั้ง" : "รอสถานะเอกสารเปลี่ยนเป็นพร้อมใช้งาน",
      actionLabel: "ไปหน้าอัปโหลด",
      actionHref: "/upload"
    };
  }

  if (lower.includes("ลบ") || lower.includes("เปลี่ยนชื่อ")) {
    return {
      severity: lower.includes("ไม่สำเร็จ") ? "error" : "success",
      title: lower.includes("ไม่สำเร็จ") ? "ทำรายการไม่สำเร็จ" : "บันทึกการเปลี่ยนแปลงแล้ว",
      message: status
    };
  }

  if (lower.includes("ไม่สามารถ") || lower.includes("ผิดพลาด") || lower.includes("ไม่สำเร็จ")) {
    return {
      severity: "error",
      title: "เกิดข้อผิดพลาด",
      message: status,
      nextStep: "ลองใหม่อีกครั้ง หรือเปิดหน้าตรวจระบบถ้าเกิดซ้ำ",
      actionLabel: "เปิด Diagnostics",
      actionHref: "/admin"
    };
  }

  return {
    severity: "info",
    title: "สถานะล่าสุด",
    message: status
  };
}
