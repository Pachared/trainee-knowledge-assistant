import type { RetrievedContext } from "@/lib/rag/rag-service";

type FallbackChunk = {
  id: string;
  content: string;
  document: {
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

function termFrequency(tokens: string[]) {
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }
  return frequencies;
}

export function rankFallbackChunks(chunks: FallbackChunk[], query: string, limit: number): RetrievedContext[] {
  const queryTerms = Array.from(new Set(tokenize(query)));
  const fallbackTerms = queryTerms.length ? queryTerms : [query.toLowerCase().trim()].filter(Boolean);
  const documentFrequency = new Map<string, number>();
  const tokenized = chunks.map((chunk) => {
    const tokens = tokenize(`${chunk.document.title} ${chunk.content}`);
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
        documentTitle: chunk.document.title,
        content: chunk.content,
        score
      };
    })
    .sort((left, right) => right.score - left.score || left.chunkId.localeCompare(right.chunkId))
    .slice(0, limit);
}
