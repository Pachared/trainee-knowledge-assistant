import {
  addAssistantMessage,
  addUserMessage,
  ensureChat,
  getChatMessages,
  updateChatTitleFromPrompt
} from "@/lib/chat/chat-service";
import {
  type AssistantTokenUsage,
  buildAssistantPrompt,
  summarizeUsage,
  streamAssistantText
} from "@/lib/ai/assistant-service";
import { getOpenAIModel } from "@/lib/ai/openai-client";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { jsonError, parseRouteError } from "@/lib/http/response";
import { retrieveContext } from "@/lib/rag/rag-service";
import { recordUsage } from "@/lib/usage/usage-service";
import { chatPromptSchema } from "@/lib/validation/schemas";
import { clientIpFromHeaders, sanitizePlainText } from "@/lib/security/input";
import { chatRateLimiter } from "@/lib/security/rate-limit";
import { assertDailyChatQuota } from "@/lib/security/quota";

export const runtime = "nodejs";

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const limit = chatRateLimiter.check(`chat:${user.id}:${clientIpFromHeaders(request.headers)}`);

    if (!limit.allowed) {
      return jsonError("ส่งข้อความถี่เกินไป กรุณาลองใหม่ภายหลัง", 429, { resetAt: limit.resetAt });
    }

    const body = chatPromptSchema.parse(await request.json());
    const message = sanitizePlainText(body.message);
    await assertDailyChatQuota(user.id);
    const chat = await ensureChat(user.id, body.sessionId);
    const existingChat = await getChatMessages(user.id, chat.id);
    const isFirstMessage = existingChat.messages.length === 0;
    await addUserMessage(chat.id, message);

    if (isFirstMessage) {
      await updateChatTitleFromPrompt(chat.id, message);
    }

    const contexts = await retrieveContext({
      userId: user.id,
      query: message,
      documentId: body.documentId,
      limit: 5
    });
    const history = existingChat.messages.map((item) => ({
      role: item.role,
      content: item.content
    }));
    const prompt = buildAssistantPrompt({ message, history, contexts });
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let output = "";
        let actualUsage: AssistantTokenUsage | undefined;

        try {
          controller.enqueue(
            encoder.encode(
              sse("meta", {
                chatId: chat.id,
                citations: contexts.map((context, index) => ({
                  index: index + 1,
                  chunkId: context.chunkId,
                  title: context.documentTitle
                }))
              })
            )
          );

          for await (const chunk of streamAssistantText(
            { message, history, contexts },
            { onUsage: (usage) => (actualUsage = usage) }
          )) {
            output += chunk;
            controller.enqueue(encoder.encode(sse("delta", { content: chunk })));
          }

          const usage = summarizeUsage({
            prompt,
            output,
            model: getOpenAIModel(),
            actualUsage
          });
          const assistantMessage = await addAssistantMessage({
            chatSessionId: chat.id,
            content: output,
            promptTokens: usage.promptTokens,
            outputTokens: usage.completionTokens,
            citedChunkIds: contexts.map((context) => context.chunkId),
            model: usage.model
          });
          const usageRecord = await recordUsage({
            chatSessionId: chat.id,
            messageId: assistantMessage.id,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            model: usage.model
          });

          controller.enqueue(
            encoder.encode(
              sse("done", {
                message: assistantMessage,
                usage: usageRecord
              })
            )
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              sse("error", {
                message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดระหว่างสร้างคำตอบ"
              })
            )
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    return parseRouteError(error);
  }
}
