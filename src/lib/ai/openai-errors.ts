type OpenAIErrorShape = {
  status?: number;
  code?: string;
  type?: string;
  message?: string;
};

function errorShape(error: unknown): OpenAIErrorShape {
  if (!error || typeof error !== "object") {
    return {};
  }

  const shaped = error as Record<string, unknown>;
  return {
    status: typeof shaped.status === "number" ? shaped.status : undefined,
    code: typeof shaped.code === "string" ? shaped.code : undefined,
    type: typeof shaped.type === "string" ? shaped.type : undefined,
    message: typeof shaped.message === "string" ? shaped.message : undefined
  };
}

export function formatAssistantError(error: unknown) {
  const shaped = errorShape(error);
  const status = shaped.status;
  const code = `${shaped.code ?? ""} ${shaped.type ?? ""} ${shaped.message ?? ""}`.toLowerCase();

  if (status === 401 || code.includes("invalid_api_key")) {
    return "OpenAI API key ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจค่า OPENAI_API_KEY";
  }

  if (status === 429 || code.includes("rate_limit") || code.includes("quota")) {
    return "OpenAI ถูกจำกัด rate limit หรือ quota ไม่พอ กรุณารอสักครู่หรือตรวจ billing/quota";
  }

  if (status === 404 || code.includes("model")) {
    return "OpenAI model ที่ตั้งค่าไว้ใช้งานไม่ได้ กรุณาตรวจค่า OPENAI_MODEL";
  }

  if (status === 408 || status === 504 || code.includes("timeout")) {
    return "OpenAI ใช้เวลาตอบนานเกินไป กรุณาลองใหม่อีกครั้ง";
  }

  if (status && status >= 500) {
    return "OpenAI service มีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง";
  }

  return shaped.message || "เกิดข้อผิดพลาดระหว่างสร้างคำตอบ";
}
