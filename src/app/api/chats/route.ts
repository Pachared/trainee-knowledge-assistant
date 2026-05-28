import { createChat, listChats } from "@/lib/chat/chat-service";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createChatSchema, searchQuerySchema } from "@/lib/validation/schemas";
import { jsonOk, parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const url = new URL(request.url);
    const query = searchQuerySchema.parse({ q: url.searchParams.get("q") ?? undefined });
    const chats = await listChats(user.id, query.q);

    return jsonOk({ chats });
  } catch (error) {
    return parseRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = createChatSchema.parse(await request.json().catch(() => ({})));
    const chat = await createChat(user.id, body.title);

    return jsonOk({ chat }, { status: 201 });
  } catch (error) {
    return parseRouteError(error);
  }
}
