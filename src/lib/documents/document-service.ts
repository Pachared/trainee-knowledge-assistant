import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getNumberEnv } from "@/lib/env";
import { saveUpload } from "@/lib/documents/file-storage";
import { extractTextFromFile } from "@/lib/documents/extract-text";
import { chunkText } from "@/lib/rag/chunker";
import { indexChunksInChroma } from "@/lib/rag/rag-service";
import { uploadConstraints } from "@/lib/validation/schemas";

function validateUpload(file: File) {
  const maxBytes = getNumberEnv("MAX_UPLOAD_MB", 10) * 1024 * 1024;
  const extension = path.extname(file.name).toLowerCase();

  if (!uploadConstraints.allowedMimeTypes.has(file.type) || !uploadConstraints.allowedExtensions.has(extension)) {
    throw new Error("รองรับเฉพาะไฟล์ PDF และ TXT เท่านั้น");
  }

  if (file.size <= 0) {
    throw new Error("ไฟล์ว่างเปล่า");
  }

  if (file.size > maxBytes) {
    throw new Error(`ไฟล์ใหญ่เกิน ${getNumberEnv("MAX_UPLOAD_MB", 10)} MB`);
  }
}

export async function uploadDocument(userId: string, file: File) {
  validateUpload(file);

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveUpload(buffer, file.name);
  const document = await prisma.document.create({
    data: {
      userId,
      title: path.parse(saved.filename).name,
      filename: saved.filename,
      mimeType: file.type,
      size: file.size,
      path: saved.path,
      status: "processing"
    }
  });

  try {
    const text = await extractTextFromFile(buffer, file.type);
    const chunks = chunkText(text);

    if (!chunks.length) {
      throw new Error("ไม่พบข้อความในไฟล์");
    }

    const storedChunks = await prisma.$transaction(
      chunks.map((chunk) =>
        prisma.documentChunk.create({
          data: {
            documentId: document.id,
            chunkIndex: chunk.index,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            chromaId: `${document.id}-${chunk.index}-${randomUUID()}`
          }
        })
      )
    );

    try {
      await indexChunksInChroma({
        userId,
        documentId: document.id,
        chunks: storedChunks.map((chunk) => ({
          id: chunk.id,
          chromaId: chunk.chromaId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex
        }))
      });
      await prisma.document.update({
        where: { id: document.id },
        data: { status: "ready" }
      });
    } catch {
      await prisma.document.update({
        where: { id: document.id },
        data: { status: "ready_without_chroma" }
      });
    }

    return prisma.document.findUniqueOrThrow({
      where: { id: document.id },
      include: {
        chunks: {
          select: { id: true }
        }
      }
    });
  } catch (error) {
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "failed" }
    });
    throw error;
  }
}

export async function listDocuments(userId: string) {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          chunks: true
        }
      }
    }
  });
}
