import { prisma } from "@/lib/db/prisma";
import { getNumberEnv } from "@/lib/env";
import { embedText, embedTexts } from "@/lib/rag/embeddings";
import { getChromaCollection } from "@/lib/rag/chroma";

export type RetrievedContext = {
  chunkId: string;
  documentTitle: string;
  content: string;
  score: number;
};

const SUMMARY_INTENT_REGEX =
  /(สรุป|ย่อความ|ใจความสำคัญ|ภาพรวม|ทั้งเอกสาร|ทั้งไฟล์|ทั้งหมด|summari[sz]e|summary|overview|entire document|whole document)/i;

export function isWholeDocumentSummaryRequest(message: string) {
  return SUMMARY_INTENT_REGEX.test(message);
}

export async function indexChunksInChroma(input: {
  userId: string;
  documentId: string;
  chunks: Array<{ id: string; chromaId: string; content: string; chunkIndex: number }>;
}) {
  if (!input.chunks.length) {
    return;
  }

  const embeddings = await embedTexts(input.chunks.map((chunk) => chunk.content));
  const collection = await getChromaCollection();

  await collection.add({
    ids: input.chunks.map((chunk) => chunk.chromaId),
    documents: input.chunks.map((chunk) => chunk.content),
    embeddings,
    metadatas: input.chunks.map((chunk) => ({
      userId: input.userId,
      documentId: input.documentId,
      chunkId: chunk.id,
      chunkIndex: chunk.chunkIndex
    }))
  });
}

export async function deleteDocumentFromChroma(documentId: string) {
  const collection = await getChromaCollection();
  await collection.delete({ where: { documentId } });
}

export async function retrieveContext(input: {
  userId: string;
  query: string;
  documentId?: string;
  limit?: number;
}): Promise<RetrievedContext[]> {
  const limit = input.limit ?? 5;

  try {
    const collection = await getChromaCollection();
    const embedding = await embedText(input.query);
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: limit,
      where: input.documentId ? { documentId: input.documentId } : { userId: input.userId }
    });
    const chromaIds = results.ids?.[0] ?? [];

    if (chromaIds.length) {
      const chunks = await prisma.documentChunk.findMany({
        where: {
          chromaId: { in: chromaIds },
          document: {
            userId: input.userId,
            ...(input.documentId ? { id: input.documentId } : {})
          }
        },
        include: {
          document: true
        }
      });
      const byChromaId = new Map(chunks.map((chunk) => [chunk.chromaId, chunk]));

      return chromaIds.flatMap((chromaId, index) => {
        const chunk = byChromaId.get(chromaId);
        if (!chunk) {
          return [];
        }

        return {
          chunkId: chunk.id,
          documentTitle: chunk.document.title,
          content: chunk.content,
          score: results.distances?.[0]?.[index] ?? 0
        };
      });
    }
  } catch {
    // Fall back to SQLite keyword search when Chroma is not running.
  }

  const fallbackChunks = await prisma.documentChunk.findMany({
    where: {
      content: { contains: input.query.split(/\s+/)[0] || input.query },
      document: {
        userId: input.userId,
        ...(input.documentId ? { id: input.documentId } : {})
      }
    },
    include: {
      document: true
    },
    take: limit,
    orderBy: { createdAt: "desc" }
  });

  return fallbackChunks.map((chunk) => ({
    chunkId: chunk.id,
    documentTitle: chunk.document.title,
    content: chunk.content,
    score: 0
  }));
}

export async function retrieveWholeDocumentContext(input: {
  userId: string;
  documentId: string;
  maxChunks?: number;
  maxTokens?: number;
}): Promise<RetrievedContext[]> {
  const maxChunks = input.maxChunks ?? getNumberEnv("FULL_DOCUMENT_CONTEXT_MAX_CHUNKS", 200);
  const maxTokens = input.maxTokens ?? getNumberEnv("FULL_DOCUMENT_CONTEXT_MAX_TOKENS", 120_000);
  const chunks = await prisma.documentChunk.findMany({
    where: {
      documentId: input.documentId,
      document: {
        userId: input.userId
      }
    },
    include: {
      document: true
    },
    orderBy: { chunkIndex: "asc" },
    take: maxChunks
  });

  let usedTokens = 0;
  const contexts: RetrievedContext[] = [];

  for (const chunk of chunks) {
    const nextTokens = usedTokens + chunk.tokenCount;

    if (contexts.length > 0 && nextTokens > maxTokens) {
      break;
    }

    usedTokens = nextTokens;
    contexts.push({
      chunkId: chunk.id,
      documentTitle: chunk.document.title,
      content: chunk.content,
      score: 0
    });
  }

  return contexts;
}
