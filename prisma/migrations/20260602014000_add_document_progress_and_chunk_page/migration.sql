-- Add UX-facing progress fields for background document jobs.
ALTER TABLE "Document" ADD COLUMN "jobStage" TEXT;
ALTER TABLE "Document" ADD COLUMN "jobProgress" INTEGER NOT NULL DEFAULT 0;

-- Store source page metadata for citation preview when available.
ALTER TABLE "DocumentChunk" ADD COLUMN "pageNumber" INTEGER;
