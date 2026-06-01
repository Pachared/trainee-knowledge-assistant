import { getChatMessages, hydrateMessagesWithCitations } from "@/lib/chat/chat-service";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { jsonOk, parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    chatId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const { chatId } = await context.params;
    const chat = await getChatMessages(user.id, chatId);
    const messages = await hydrateMessagesWithCitations(user.id, chat.messages);

    return jsonOk({ chat: { ...chat, messages } });
  } catch (error) {
    return parseRouteError(error);
  }
}
