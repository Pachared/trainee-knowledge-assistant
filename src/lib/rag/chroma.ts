import { getChromaConfig } from "@/lib/env";

type ChromaCollection = {
  add(input: {
    ids: string[];
    documents: string[];
    embeddings: number[][];
    metadatas: Record<string, string | number | boolean>[];
  }): Promise<void>;
  delete(input: { ids?: string[]; where?: Record<string, string | number | boolean> }): Promise<void>;
  query(input: {
    queryEmbeddings: number[][];
    nResults: number;
    where?: Record<string, string | number | boolean>;
  }): Promise<{
    ids?: string[][];
    documents?: (string | null)[][];
    metadatas?: (Record<string, unknown> | null)[][];
    distances?: number[][];
  }>;
};

let collectionPromise: Promise<ChromaCollection> | null = null;

function chromaClientOptions(url: string) {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80)),
    ssl: parsed.protocol === "https:"
  };
}

export async function getChromaCollection(): Promise<ChromaCollection> {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const { ChromaClient } = (await import("chromadb")) as unknown as {
        ChromaClient: new (options: { host: string; port: number; ssl: boolean }) => {
          getOrCreateCollection(input: { name: string; embeddingFunction: null }): Promise<ChromaCollection>;
        };
      };
      const config = getChromaConfig();
      const client = new ChromaClient(chromaClientOptions(config.url));

      return client.getOrCreateCollection({ name: config.collection, embeddingFunction: null });
    })();
  }

  try {
    return await collectionPromise;
  } catch (error) {
    collectionPromise = null;
    throw error;
  }
}
