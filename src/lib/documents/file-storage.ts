import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function sanitizeFilename(filename: string) {
  const basename = path.basename(filename).replace(/[^\p{L}\p{N}._-]+/gu, "-");
  const trimmed = basename.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return trimmed || `upload-${Date.now()}`;
}

export async function saveUpload(buffer: Buffer, originalName: string) {
  const uploadDir = path.join(process.cwd(), "data", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const safeName = sanitizeFilename(originalName);
  const storedName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const filePath = path.join(uploadDir, storedName);
  await writeFile(filePath, buffer);

  return {
    filename: safeName,
    path: filePath
  };
}
