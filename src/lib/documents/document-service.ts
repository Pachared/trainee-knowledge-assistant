import { unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getNumberEnv } from "@/lib/env";
import { saveUpload } from "@/lib/documents/file-storage";
import { extractTextFromFile } from "@/lib/documents/extract-text";
import { chunkText } from "@/lib/rag/chunker";
import { deleteDocumentFromChroma, indexChunksInChroma } from "@/lib/rag/rag-service";
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

function formatFailureReason(error: unknown) {
  const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
  return message.slice(0, 1000);
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
      status: "processing",
      failedReason: null
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
        data: { status: "ready", failedReason: null }
      });
    } catch (error) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "ready_without_chroma",
          failedReason: `Chroma indexing failed: ${formatFailureReason(error)}`
        }
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
      data: {
        status: "failed",
        failedReason: formatFailureReason(error)
      }
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

export async function deleteDocument(userId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId
    }
  });

  if (!document) {
    throw new Error("ไม่พบเอกสารนี้");
  }

  await deleteDocumentFromChroma(document.id).catch(() => undefined);
  await prisma.document.delete({
    where: { id: document.id }
  });
  await unlink(document.path).catch(() => undefined);
}

export async function reindexDocument(userId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId
    },
    include: {
      chunks: {
        orderBy: { chunkIndex: "asc" }
      }
    }
  });

  if (!document) {
    throw new Error("ไม่พบเอกสารนี้");
  }

  if (!document.chunks.length) {
    const updated = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "failed",
        failedReason: "ไม่สามารถ re-index ได้ เพราะเอกสารนี้ไม่มี chunks"
      }
    });
    throw new Error(updated.failedReason ?? "ไม่สามารถ re-index ได้");
  }

  try {
    await deleteDocumentFromChroma(document.id).catch(() => undefined);
    await indexChunksInChroma({
      userId,
      documentId: document.id,
      chunks: document.chunks.map((chunk) => ({
        id: chunk.id,
        chromaId: chunk.chromaId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex
      }))
    });

    return prisma.document.update({
      where: { id: document.id },
      data: {
        status: "ready",
        failedReason: null
      }
    });
  } catch (error) {
    const failedReason = `Chroma indexing failed: ${formatFailureReason(error)}`;
    const updated = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "ready_without_chroma",
        failedReason
      }
    });

    const reindexError = new Error(failedReason) as Error & { document?: typeof updated };
    reindexError.document = updated;
    throw reindexError;
  }
}

export async function reindexPendingDocuments(userId: string) {
  const pendingDocuments = await prisma.document.findMany({
    where: {
      userId,
      status: "ready_without_chroma"
    },
    select: {
      id: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });
  const results: Array<{ id: string; status: string; failedReason?: string | null }> = [];
  let succeeded = 0;
  let failed = 0;

  for (const document of pendingDocuments) {
    try {
      const updated = await reindexDocument(userId, document.id);
      results.push({
        id: updated.id,
        status: updated.status,
        failedReason: updated.failedReason
      });
      succeeded += 1;
    } catch (error) {
      const errorDocument = error instanceof Error && "document" in error
        ? (error as Error & { document?: { id: string; status: string; failedReason?: string | null } }).document
        : undefined;

      results.push({
        id: errorDocument?.id ?? document.id,
        status: errorDocument?.status ?? "ready_without_chroma",
        failedReason: errorDocument?.failedReason ?? (error instanceof Error ? error.message : "re-index Chroma ไม่สำเร็จ")
      });
      failed += 1;
    }
  }

  return {
    total: pendingDocuments.length,
    succeeded,
    failed,
    documents: results
  };
}
