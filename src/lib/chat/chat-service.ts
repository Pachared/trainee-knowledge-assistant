import { prisma } from "@/lib/db/prisma";
import { estimateTokens } from "@/lib/ai/tokenizer";

type MessageWithCitedChunks = {
  id: string;
  citedChunkIds: string | null;
};

export async function listChats(userId: string, query?: string) {
  return prisma.chatSession.findMany({
    where: {
      userId,
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              {
                messages: {
                  some: {
                    content: { contains: query }
                  }
                }
              }
            ]
          }
        : {})
    },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
}

export async function createChat(userId: string, title = "แชทใหม่") {
  return prisma.chatSession.create({
    data: {
      userId,
      title: title || "แชทใหม่"
    }
  });
}

export async function renameChat(userId: string, chatSessionId: string, title: string) {
  const chat = await prisma.chatSession.findFirst({
    where: {
      id: chatSessionId,
      userId
    }
  });

  if (!chat) {
    throw new Error("ไม่พบแชทนี้");
  }

  return prisma.chatSession.update({
    where: { id: chatSessionId },
    data: { title }
  });
}

export async function deleteChat(userId: string, chatSessionId: string) {
  const chat = await prisma.chatSession.findFirst({
    where: {
      id: chatSessionId,
      userId
    }
  });

  if (!chat) {
    throw new Error("ไม่พบแชทนี้");
  }

  await prisma.chatSession.delete({
    where: { id: chatSessionId }
  });
}

export async function getChatMessages(userId: string, chatSessionId: string) {
  const chat = await prisma.chatSession.findFirst({
    where: {
      id: chatSessionId,
      userId
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!chat) {
    throw new Error("ไม่พบแชทนี้");
  }

  return chat;
}

export async function hydrateMessagesWithCitations<T extends MessageWithCitedChunks>(userId: string, messages: T[]) {
  const chunkIds = Array.from(
    new Set(
      messages.flatMap((message) =>
        (message.citedChunkIds ?? "")
          .split(",")
          .map((chunkId) => chunkId.trim())
          .filter(Boolean)
      )
    )
  );

  if (!chunkIds.length) {
    return messages.map((message) => ({ ...message, citations: [] }));
  }

  const chunks = await prisma.documentChunk.findMany({
    where: {
      id: { in: chunkIds },
      document: { userId }
    },
    include: {
      document: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  return messages.map((message) => {
    const citations = (message.citedChunkIds ?? "")
      .split(",")
      .map((chunkId) => chunkId.trim())
      .filter(Boolean)
      .map((chunkId, index) => {
        const chunk = byId.get(chunkId);

        if (!chunk) {
          return {
            index: index + 1,
            chunkId,
            title: "ไม่พบแหล่งอ้างอิงแล้ว"
          };
        }

        return {
          index: index + 1,
          chunkId,
          documentId: chunk.document.id,
          title: chunk.document.title,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          excerpt: chunk.content.slice(0, 700)
        };
      });

    return {
      ...message,
      citations
    };
  });
}

export async function ensureChat(userId: string, chatSessionId?: string) {
  if (!chatSessionId) {
    return createChat(userId);
  }

  const chat = await prisma.chatSession.findFirst({
    where: {
      id: chatSessionId,
      userId
    }
  });

  if (!chat) {
    throw new Error("ไม่พบแชทนี้");
  }

  return chat;
}

export async function addUserMessage(chatSessionId: string, content: string) {
  const promptTokens = estimateTokens(content);

  return prisma.message.create({
    data: {
      chatSessionId,
      role: "user",
      content,
      promptTokens
    }
  });
}

export async function addAssistantMessage(input: {
  chatSessionId: string;
  content: string;
  promptTokens: number;
  outputTokens: number;
  citedChunkIds: string[];
  model: string;
}) {
  return prisma.message.create({
    data: {
      chatSessionId: input.chatSessionId,
      role: "assistant",
      content: input.content,
      promptTokens: input.promptTokens,
      outputTokens: input.outputTokens,
      citedChunkIds: input.citedChunkIds.length ? input.citedChunkIds.join(",") : null,
      model: input.model
    }
  });
}

export async function updateChatTitleFromPrompt(chatSessionId: string, prompt: string) {
  const title = prompt.replace(/\s+/g, " ").trim().slice(0, 52) || "แชทใหม่";

  return prisma.chatSession.update({
    where: { id: chatSessionId },
    data: { title }
  });
}
