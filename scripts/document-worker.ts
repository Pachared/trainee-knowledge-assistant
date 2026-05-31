import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "@/lib/db/prisma";
import { getNumberEnv } from "@/lib/env";
import { processQueuedDocuments } from "@/lib/documents/document-service";

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

  console.log(`Document worker started. interval=${intervalMs}ms batchSize=${batchSize}`);

  while (!shuttingDown) {
    try {
      const processed = await processQueuedDocuments(batchSize);
      if (processed.length) {
        console.log(`Document worker processed ${processed.length} document(s).`);
      }
    } catch (error) {
      console.error("Document worker cycle failed:", error);
    }

    await delay(intervalMs);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
