import { prisma } from "@/lib/db/prisma";

type RecordUsageInput = {
  chatSessionId: string;
  messageId: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
};

export async function recordUsage(input: RecordUsageInput) {
  const totalTokens = input.promptTokens + input.completionTokens;

  return prisma.tokenUsage.create({
    data: {
      chatSessionId: input.chatSessionId,
      messageId: input.messageId,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens,
      model: input.model
    }
  });
}

export async function getUsageSummary(userId: string) {
  const chats = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      usage: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  return chats.map((chat) => {
    const totals = chat.usage.reduce(
      (sum, item) => ({
        promptTokens: sum.promptTokens + item.promptTokens,
        completionTokens: sum.completionTokens + item.completionTokens,
        totalTokens: sum.totalTokens + item.totalTokens
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );

    return {
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      messageCount: chat.usage.length,
      ...totals
    };
  });
}
