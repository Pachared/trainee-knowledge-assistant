import { estimateTokens } from "@/lib/ai/tokenizer";
import { getNumberEnv } from "@/lib/env";
import type { RetrievedContext } from "@/lib/rag/rag-service";

function totalTokens(contexts: RetrievedContext[]) {
  return contexts.reduce((sum, context) => sum + estimateTokens(context.content), 0);
}

function compactText(text: string, maxChars: number) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxChars) {
    return normalized;
  }

  const edgeLength = Math.max(120, Math.floor(maxChars / 2));
  return `${normalized.slice(0, edgeLength).trim()} ... ${normalized.slice(-edgeLength).trim()}`;
}

function summarizeGroup(contexts: RetrievedContext[], groupIndex: number): RetrievedContext {
  const first = contexts[0];
  const last = contexts[contexts.length - 1];
  const snippets = contexts
    .map((context, index) => `- ส่วนที่ ${index + 1}: ${compactText(context.content, 900)}`)
    .join("\n");

  return {
    chunkId: `summary-group-${groupIndex + 1}-${first?.chunkId ?? "unknown"}-${last?.chunkId ?? "unknown"}`,
    documentTitle: first?.documentTitle ?? "Document summary",
    content: [
      `สรุปย่อยกลุ่มที่ ${groupIndex + 1} จากเอกสาร "${first?.documentTitle ?? "ไม่ทราบชื่อ"}"`,
      `ครอบคลุม ${contexts.length} chunks ตามลำดับต้นฉบับ`,
      snippets
    ].join("\n"),
    score: 0
  };
}

export function fitSummaryContextsToBudget(contexts: RetrievedContext[], maxTokens = getNumberEnv("FULL_DOCUMENT_CONTEXT_MAX_TOKENS", 120_000)) {
  if (totalTokens(contexts) <= maxTokens) {
    return contexts;
  }

  const batchTokens = getNumberEnv("FULL_DOCUMENT_SUMMARY_BATCH_TOKENS", 8_000);
  const reduced: RetrievedContext[] = [];
  let current: RetrievedContext[] = [];
  let currentTokens = 0;

  for (const context of contexts) {
    const contextTokens = estimateTokens(context.content);
    const wouldExceed = current.length > 0 && currentTokens + contextTokens > batchTokens;

    if (wouldExceed) {
      reduced.push(summarizeGroup(current, reduced.length));
      current = [];
      currentTokens = 0;
    }

    current.push(context);
    currentTokens += contextTokens;
  }

  if (current.length) {
    reduced.push(summarizeGroup(current, reduced.length));
  }

  if (totalTokens(reduced) <= maxTokens || reduced.length === contexts.length) {
    return reduced;
  }

  return fitSummaryContextsToBudget(reduced, maxTokens);
}
