import { deleteChat, renameChat } from "@/lib/chat/chat-service";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { jsonOk, parseRouteError } from "@/lib/http/response";
import { renameChatSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    chatId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const { chatId } = await context.params;
    const body = renameChatSchema.parse(await request.json().catch(() => ({})));
    const chat = await renameChat(user.id, chatId, body.title);

    return jsonOk({ chat });
  } catch (error) {
    return parseRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const { chatId } = await context.params;
    await deleteChat(user.id, chatId);

    return jsonOk({ deleted: true });
  } catch (error) {
    return parseRouteError(error);
  }
}
