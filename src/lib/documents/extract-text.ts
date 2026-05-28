export async function extractTextFromFile(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") {
    const mod = (await import("pdf-parse")) as unknown as {
      default?: (data: Buffer) => Promise<{ text: string }>;
    };
    const pdfParse = mod.default;

    if (!pdfParse) {
      throw new Error("ไม่สามารถโหลดตัวอ่าน PDF ได้");
    }

    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  return buffer.toString("utf8");
}
