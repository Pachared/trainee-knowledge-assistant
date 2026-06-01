import { createHash } from "node:crypto";
import { estimateTokens } from "@/lib/ai/tokenizer";

const SUMMARY_SOURCE_VERSION = "comprehensive-v2";

type SummaryChunk = {
  chunkIndex: number;
  content: string;
};

function compact(text: string, maxLength = 360) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

export function hashSummarySource(chunks: SummaryChunk[]) {
  const hash = createHash("sha256");
  hash.update(`${SUMMARY_SOURCE_VERSION}\n`);

  for (const chunk of chunks) {
    hash.update(`${chunk.chunkIndex}:${chunk.content}\n`);
  }

  return hash.digest("hex");
}

export function buildExtractiveDocumentSummary(chunks: SummaryChunk[], documentTitle: string) {
  const ordered = [...chunks].sort((left, right) => left.chunkIndex - right.chunkIndex);

  return [
    `สรุปย่อเอกสาร "${documentTitle}"`,
    `ครอบคลุม ${ordered.length} chunks จากต้นฉบับตามลำดับ`,
    ...ordered.map((chunk) => `ส่วนที่ ${chunk.chunkIndex + 1}: ${compact(chunk.content, 700)}`)
  ].join("\n");
}

export function estimateSummaryTokens(summary: string) {
  return estimateTokens(summary);
}
