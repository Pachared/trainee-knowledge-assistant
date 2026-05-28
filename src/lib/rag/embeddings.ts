import { getOpenAIClient, getOpenAIEmbeddingModel } from "@/lib/ai/openai-client";

const FALLBACK_DIMENSIONS = 64;

export function deterministicEmbedding(text: string, dimensions = FALLBACK_DIMENSIONS): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  const normalized = text.toLowerCase();

  for (let index = 0; index < normalized.length; index += 1) {
    const charCode = normalized.charCodeAt(index);
    vector[(charCode + index) % dimensions] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();

  if (!client) {
    return texts.map((text) => deterministicEmbedding(text));
  }

  const response = await client.embeddings.create({
    model: getOpenAIEmbeddingModel(),
    input: texts
  });

  return response.data.map((item) => item.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding ?? deterministicEmbedding(text);
}
