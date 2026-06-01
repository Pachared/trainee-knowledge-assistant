import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getNumberEnv } from "@/lib/env";
import { computeDocumentRetryDelayMs } from "@/lib/documents/document-job";
import { saveUpload } from "@/lib/documents/file-storage";
import { extractTextWithPagesFromFile } from "@/lib/documents/extract-text";
import { chunkTextPages } from "@/lib/rag/chunker";
import { buildExtractiveDocumentSummary, estimateSummaryTokens, hashSummarySource } from "@/lib/rag/document-summary";
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

export function formatFailureReason(error: unknown) {
  const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
  return message.slice(0, 1000);
}

function isPermanentDocumentFailure(error: unknown) {
  const message = formatFailureReason(error).toLowerCase();
  return [
    "invalid pdf",
    "ไม่พบข้อความในไฟล์",
    "รองรับเฉพาะไฟล์",
    "ไฟล์ว่างเปล่า",
    "ไฟล์ใหญ่เกิน"
  ].some((pattern) => message.includes(pattern));
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
      status: "queued",
      failedReason: null,
      jobStage: "queued",
      jobProgress: 10,
      indexingAttempts: 0,
      lockedAt: null,
      lockedBy: null,
      nextAttemptAt: null
    }
  });

  return prisma.document.findUniqueOrThrow({
    where: { id: document.id },
    include: {
      chunks: {
        select: { id: true }
      }
    }
  });
}

async function clearJobLock(documentId: string, data: Record<string, unknown>) {
  return prisma.document.update({
    where: { id: documentId },
    data: {
      ...data,
      lockedAt: null,
      lockedBy: null
    }
  });
}

async function updateJobProgress(documentId: string, jobStage: string, jobProgress: number) {
  return prisma.document.update({
    where: { id: documentId },
    data: {
      jobStage,
      jobProgress
    }
  });
}

async function retryOrFailDocument(document: { id: string; indexingAttempts: number }, error: unknown) {
  const maxAttempts = getNumberEnv("DOCUMENT_WORKER_MAX_ATTEMPTS", 3);
  const nextAttempts = document.indexingAttempts + 1;
  const failedReason = formatFailureReason(error);

  if (!isPermanentDocumentFailure(error) && nextAttempts < maxAttempts) {
    return clearJobLock(document.id, {
      status: "queued",
      failedReason,
      jobStage: "retry_waiting",
      jobProgress: 15,
      indexingAttempts: nextAttempts,
      nextAttemptAt: new Date(Date.now() + computeDocumentRetryDelayMs(nextAttempts))
    });
  }

  return clearJobLock(document.id, {
    status: "failed",
    failedReason,
    jobStage: "failed",
    jobProgress: 100,
    indexingAttempts: nextAttempts,
    nextAttemptAt: null
  });
}

async function upsertDocumentSummary(documentId: string, title: string, chunks: Array<{ chunkIndex: number; content: string }>) {
  const sourceHash = hashSummarySource(chunks);
  const existing = await prisma.documentSummary.findUnique({
    where: { documentId }
  });

  if (existing?.sourceHash === sourceHash) {
    return existing;
  }

  const content = buildExtractiveDocumentSummary(chunks, title);

  return prisma.documentSummary.upsert({
    where: { documentId },
    update: {
      content,
      tokenCount: estimateSummaryTokens(content),
      sourceHash,
      generatedAt: new Date()
    },
    create: {
      documentId,
      content,
      tokenCount: estimateSummaryTokens(content),
      sourceHash
    }
  });
}

export async function processDocument(documentId: string, workerId = "manual") {
  const document = await prisma.document.findUnique({
    where: { id: documentId }
  });

  if (!document) {
    return null;
  }

  await prisma.document.update({
    where: { id: document.id },
    data: {
      status: "processing",
      failedReason: null,
      jobStage: "starting",
      jobProgress: 20,
      lockedAt: new Date(),
      lockedBy: workerId
    }
  });

  try {
    await updateJobProgress(document.id, "extracting", 30);
    const buffer = await readFile(document.path);
    const extracted = await extractTextWithPagesFromFile(buffer, document.mimeType);
    await updateJobProgress(document.id, "chunking", 45);
    const chunks = chunkTextPages(extracted.pages);

    if (!chunks.length) {
      throw new Error("ไม่พบข้อความในไฟล์");
    }

    await updateJobProgress(document.id, "saving_chunks", 55);
    await deleteDocumentFromChroma(document.id).catch(() => undefined);
    await prisma.documentChunk.deleteMany({
      where: { documentId: document.id }
    });

    const storedChunks = await prisma.$transaction(
      chunks.map((chunk) =>
        prisma.documentChunk.create({
          data: {
            documentId: document.id,
            chunkIndex: chunk.index,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            chromaId: `${document.id}-${chunk.index}-${randomUUID()}`,
            pageNumber: chunk.pageNumber ?? null
          }
        })
      )
    );
    await updateJobProgress(document.id, "summarizing", 68);
    await upsertDocumentSummary(
      document.id,
      document.title,
      storedChunks.map((chunk) => ({
        chunkIndex: chunk.chunkIndex,
        content: chunk.content
      }))
    );

    try {
      await updateJobProgress(document.id, "embedding", 78);
      await indexChunksInChroma({
        userId: document.userId,
        documentId: document.id,
        chunks: storedChunks.map((chunk) => ({
          id: chunk.id,
          chromaId: chunk.chromaId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex
        }))
      });
      await clearJobLock(document.id, {
        status: "ready",
        failedReason: null,
        jobStage: "ready",
        jobProgress: 100,
        indexingAttempts: 0,
        nextAttemptAt: null,
        lastIndexedAt: new Date()
      });
    } catch (error) {
      const nextAttempts = document.indexingAttempts + 1;
      const maxAttempts = getNumberEnv("DOCUMENT_WORKER_MAX_ATTEMPTS", 3);
      await clearJobLock(document.id, {
        status: "ready_without_chroma",
        failedReason: `Chroma indexing failed: ${formatFailureReason(error)}`,
        jobStage: "fallback_ready",
        jobProgress: 90,
        indexingAttempts: nextAttempts,
        nextAttemptAt: nextAttempts < maxAttempts
          ? new Date(Date.now() + computeDocumentRetryDelayMs(nextAttempts))
          : null
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
    return retryOrFailDocument(document, error);
  }
}

export async function claimNextDocumentJob(workerId: string) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - getNumberEnv("DOCUMENT_WORKER_LOCK_TIMEOUT_MS", 5 * 60_000));
  const document = await prisma.document.findFirst({
    where: {
      OR: [
        {
          status: "queued",
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }]
        },
        {
          status: "processing",
          lockedAt: { lt: staleBefore }
        },
        {
          status: "ready_without_chroma",
          nextAttemptAt: { lte: now }
        }
      ]
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true, lockedAt: true }
  });

  if (!document) {
    return null;
  }

  const claimed = await prisma.document.updateMany({
    where: {
      id: document.id,
      OR: [
        { status: document.status, lockedAt: document.lockedAt },
        { status: document.status, lockedAt: null }
      ]
    },
      data: {
        status: "processing",
        jobStage: "starting",
        jobProgress: 20,
        lockedAt: now,
      lockedBy: workerId
    }
  });

  return claimed.count === 1 ? document.id : null;
}

export async function processNextQueuedDocument(workerId = "worker") {
  const documentId = await claimNextDocumentJob(workerId);

  if (!documentId) {
    return null;
  }

  return processDocument(documentId, workerId);
}

export async function processQueuedDocuments(limit = 5, workerId = "worker") {
  const processed = [];

  for (let index = 0; index < limit; index += 1) {
    const document = await processNextQueuedDocument(workerId);
    if (!document) {
      break;
    }
    processed.push(document);
  }

  return processed;
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

export async function getDocumentPreview(userId: string, documentId: string, chunkId?: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId
    },
    include: {
      chunks: {
        where: chunkId ? { id: chunkId } : undefined,
        orderBy: { chunkIndex: "asc" },
        take: chunkId ? 1 : 8
      },
      _count: {
        select: {
          chunks: true
        }
      }
    }
  });

  if (!document) {
    throw new Error("ไม่พบเอกสารนี้");
  }

  return document;
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
        failedReason: "ไม่สามารถ re-index ได้ เพราะเอกสารนี้ไม่มี chunks",
        jobStage: "failed",
        jobProgress: 100
      }
    });
    throw new Error(updated.failedReason ?? "ไม่สามารถ re-index ได้");
  }

  try {
    await updateJobProgress(document.id, "reindexing_chroma", 82);
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
        failedReason: null,
        jobStage: "ready",
        jobProgress: 100,
        lastIndexedAt: new Date()
      }
    });
  } catch (error) {
    const failedReason = `Chroma indexing failed: ${formatFailureReason(error)}`;
    const updated = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "ready_without_chroma",
        failedReason,
        jobStage: "fallback_ready",
        jobProgress: 90
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

export async function reconcileChromaDocuments(userId: string) {
  const documents = await prisma.document.findMany({
    where: {
      userId,
      status: { in: ["ready", "ready_without_chroma"] },
      chunks: {
        some: {}
      }
    },
    select: { id: true },
    orderBy: { createdAt: "asc" }
  });
  const results: Array<{ id: string; status: string; failedReason?: string | null }> = [];
  let succeeded = 0;
  let failed = 0;

  for (const document of documents) {
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
        failedReason: errorDocument?.failedReason ?? (error instanceof Error ? error.message : "reconcile Chroma ไม่สำเร็จ")
      });
      failed += 1;
    }
  }

  return {
    total: documents.length,
    succeeded,
    failed,
    documents: results
  };
}
