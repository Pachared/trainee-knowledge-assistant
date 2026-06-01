import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getNumberEnv } from "@/lib/env";
import { processQueuedDocuments } from "@/lib/documents/document-service";
import { logEvent } from "@/lib/observability/logger";

let shuttingDown = false;

process.on("SIGINT", () => {
  shuttingDown = true;
});

process.on("SIGTERM", () => {
  shuttingDown = true;
});

async function main() {
  const intervalMs = getNumberEnv("DOCUMENT_WORKER_INTERVAL_MS", 3_000);
  const batchSize = getNumberEnv("DOCUMENT_WORKER_BATCH_SIZE", 3);
  const workerId = process.env.DOCUMENT_WORKER_ID || `worker-${randomUUID()}`;

  logEvent("info", "document_worker_started", { workerId, intervalMs, batchSize });

  while (!shuttingDown) {
    try {
      const processed = await processQueuedDocuments(batchSize, workerId);
      if (processed.length) {
        logEvent("info", "document_worker_processed", { workerId, count: processed.length });
      }
    } catch (error) {
      logEvent("error", "document_worker_cycle_failed", {
        workerId,
        message: error instanceof Error ? error.message : "Unknown worker error"
      });
    }

    await delay(intervalMs);
  }
}

main()
  .catch((error) => {
    logEvent("error", "document_worker_failed", {
      message: error instanceof Error ? error.message : "Unknown worker error"
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
