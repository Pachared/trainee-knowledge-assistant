import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export async function extractTextFromFile(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") {
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (data: Buffer) => Promise<{ text: string }>;

    if (!pdfParse) {
      throw new Error("ไม่สามารถโหลดตัวอ่าน PDF ได้");
    }

    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  return buffer.toString("utf8");
}
