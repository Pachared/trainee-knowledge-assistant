import type { RetrievedContext } from "@/lib/rag/rag-service";

type FallbackChunk = {
  id: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  document: {
    id: string;
    title: string;
  };
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function charNgrams(text: string, size = 3) {
  const compact = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const grams: string[] = [];

  for (let index = 0; index <= compact.length - size; index += 1) {
    grams.push(compact.slice(index, index + size));
  }

  return grams;
}

function searchTerms(text: string, unique = true) {
  const terms = tokenize(text);
  const grams = /[\u0E00-\u0E7F]/.test(text) ? charNgrams(text) : [];
  const allTerms = [...terms, ...grams];
  return unique ? Array.from(new Set(allTerms)) : allTerms;
}

function termFrequency(tokens: string[]) {
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }
  return frequencies;
}

export function rankFallbackChunks(chunks: FallbackChunk[], query: string, limit: number): RetrievedContext[] {
  const queryTerms = searchTerms(query);
  const fallbackTerms = queryTerms.length ? queryTerms : [query.toLowerCase().trim()].filter(Boolean);
  const documentFrequency = new Map<string, number>();
  const tokenized = chunks.map((chunk) => {
    const haystack = `${chunk.document.title} ${chunk.content}`;
    const tokens = searchTerms(haystack, false);
    const frequencies = termFrequency(tokens);
    const uniqueTerms = new Set(tokens);

    for (const term of fallbackTerms) {
      if (uniqueTerms.has(term)) {
        documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
      }
    }

    return {
      chunk,
      tokens,
      frequencies
    };
  });

  const totalDocuments = Math.max(1, chunks.length);

  return tokenized
    .map(({ chunk, tokens, frequencies }) => {
      const lengthNorm = Math.max(1, tokens.length);
      const score = fallbackTerms.reduce((sum, term) => {
        const tf = frequencies.get(term) ?? 0;
        const df = documentFrequency.get(term) ?? 0;
        const idf = Math.log(1 + (totalDocuments - df + 0.5) / (df + 0.5));
        return sum + (tf / Math.sqrt(lengthNorm)) * idf;
      }, 0);

      return {
        chunkId: chunk.id,
        documentId: chunk.document.id,
        documentTitle: chunk.document.title,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        content: chunk.content,
        score
      };
    })
    .sort((left, right) => right.score - left.score || left.chunkId.localeCompare(right.chunkId))
    .slice(0, limit);
}
