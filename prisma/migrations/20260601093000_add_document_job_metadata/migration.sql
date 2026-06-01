ALTER TABLE "Document" ADD COLUMN "indexingAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Document" ADD COLUMN "lockedBy" TEXT;
ALTER TABLE "Document" ADD COLUMN "lockedAt" DATETIME;
ALTER TABLE "Document" ADD COLUMN "nextAttemptAt" DATETIME;
ALTER TABLE "Document" ADD COLUMN "lastIndexedAt" DATETIME;

CREATE TABLE "DocumentSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentSummary_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DocumentSummary_documentId_key" ON "DocumentSummary"("documentId");
CREATE INDEX "Document_status_nextAttemptAt_idx" ON "Document"("status", "nextAttemptAt");
CREATE INDEX "Document_lockedAt_idx" ON "Document"("lockedAt");
