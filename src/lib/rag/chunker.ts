import { estimateTokens } from "@/lib/ai/tokenizer";

export type TextChunk = {
  index: number;
  content: string;
  tokenCount: number;
  pageNumber?: number;
};

type ChunkOptions = {
  maxChars?: number;
  overlapChars?: number;
};

export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const maxChars = options.maxChars ?? 1200;
  const overlapChars = Math.min(options.overlapChars ?? 180, Math.floor(maxChars / 3));
  const chunks: TextChunk[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    let end = Math.min(cursor + maxChars, normalized.length);

    if (end < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf("\n\n", end);
      const sentenceBreak = normalized.lastIndexOf(".", end);
      const whitespaceBreak = normalized.lastIndexOf(" ", end);
      const bestBreak = Math.max(paragraphBreak, sentenceBreak, whitespaceBreak);

      if (bestBreak > cursor + maxChars * 0.55) {
        end = bestBreak + 1;
      }
    }

    const content = normalized.slice(cursor, end).trim();
    if (content) {
      chunks.push({
        index: chunks.length,
        content,
        tokenCount: estimateTokens(content)
      });
    }

    if (end >= normalized.length) {
      break;
    }

    cursor = Math.max(0, end - overlapChars);
  }

  return chunks;
}

export function chunkTextPages(pages: Array<{ pageNumber: number; text: string }>, options: ChunkOptions = {}): TextChunk[] {
  const chunks: TextChunk[] = [];

  for (const page of pages) {
    const pageChunks = chunkText(page.text, options);

    for (const chunk of pageChunks) {
      chunks.push({
        ...chunk,
        index: chunks.length,
        pageNumber: page.pageNumber
      });
    }
  }

  return chunks;
}
