import { prisma } from "@/lib/db/prisma";
import { getNumberEnv } from "@/lib/env";

type QuotaDetails = {
  limit: number;
  used: number;
  remaining: number;
  unit: "documents" | "bytes" | "messages";
};

export class QuotaError extends Error {
  statusCode = 429;

  constructor(message: string, public details: QuotaDetails) {
    super(message);
    this.name = "QuotaError";
  }
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function assertUploadQuota(userId: string, incomingBytes: number) {
  const maxDocuments = getNumberEnv("MAX_DOCUMENTS_PER_USER", 50);
  const maxStorageBytes = getNumberEnv("MAX_STORAGE_MB_PER_USER", 100) * 1024 * 1024;
  const [documentCount, storage] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.document.aggregate({
      where: { userId },
      _sum: { size: true }
    })
  ]);
  const usedBytes = storage._sum.size ?? 0;

  if (documentCount >= maxDocuments) {
    throw new QuotaError("upload quota exceeded: จำนวนเอกสารถึงขีดจำกัดแล้ว", {
      limit: maxDocuments,
      used: documentCount,
      remaining: 0,
      unit: "documents"
    });
  }

  if (usedBytes + incomingBytes > maxStorageBytes) {
    throw new QuotaError("upload quota exceeded: พื้นที่จัดเก็บเอกสารถึงขีดจำกัดแล้ว", {
      limit: maxStorageBytes,
      used: usedBytes,
      remaining: Math.max(0, maxStorageBytes - usedBytes),
      unit: "bytes"
    });
  }
}

export async function assertDailyChatQuota(userId: string) {
  const maxMessages = getNumberEnv("MAX_DAILY_CHAT_MESSAGES_PER_USER", 200);
  const usedMessages = await prisma.message.count({
    where: {
      role: "user",
      createdAt: {
        gte: startOfToday()
      },
      chatSession: {
        userId
      }
    }
  });

  if (usedMessages >= maxMessages) {
    throw new QuotaError("chat quota exceeded: จำนวนข้อความวันนี้ถึงขีดจำกัดแล้ว", {
      limit: maxMessages,
      used: usedMessages,
      remaining: 0,
      unit: "messages"
    });
  }
}
