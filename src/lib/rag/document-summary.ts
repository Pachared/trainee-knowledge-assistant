import { createHash } from "node:crypto";
import { estimateTokens } from "@/lib/ai/tokenizer";

const SUMMARY_SOURCE_VERSION = "comprehensive-v2";

type SummaryChunk = {
  chunkIndex: number;
  pageNumber?: number | null;
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
  const sectionSize = 8;
  const sections: SummaryChunk[][] = [];

  for (let index = 0; index < ordered.length; index += sectionSize) {
    sections.push(ordered.slice(index, index + sectionSize));
  }

  const pageRange = (section: SummaryChunk[]) => {
    const pages = section
      .map((chunk) => chunk.pageNumber)
      .filter((page): page is number => typeof page === "number");

    if (!pages.length) {
      return "ไม่ทราบหน้า";
    }

    const min = Math.min(...pages);
    const max = Math.max(...pages);
    return min === max ? `หน้า ${min}` : `หน้า ${min}-${max}`;
  };

  return [
    `# สรุปเอกสาร "${documentTitle}"`,
    "",
    "## ภาพรวมเอกสาร",
    `- ครอบคลุม ${ordered.length} chunks จากต้นฉบับตามลำดับเอกสาร`,
    `- แบ่งสรุปเป็น ${sections.length} ช่วงเพื่อให้อ่านเป็นระบบและไม่ตกหล่นเนื้อหาท้ายเอกสาร`,
    "",
    "## รายละเอียดตามช่วงเอกสาร",
    ...sections.flatMap((section, sectionIndex) => [
      "",
      `### ช่วงที่ ${sectionIndex + 1} (${pageRange(section)})`,
      ...section.map((chunk) => `- ส่วนที่ ${chunk.chunkIndex + 1}: ${compact(chunk.content, 700)}`)
    ]),
    "",
    "## ข้อสรุปจากเอกสาร",
    `- เอกสารนี้มีสาระสำคัญกระจายอยู่ ${ordered.length} chunks ควรอ่านคำตอบพร้อม citation เพื่อย้อนตรวจที่มาของแต่ละส่วน`
  ].join("\n");
}

export function estimateSummaryTokens(summary: string) {
  return estimateTokens(summary);
}
