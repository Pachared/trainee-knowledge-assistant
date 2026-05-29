import { reindexPendingDocuments } from "@/lib/documents/document-service";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { jsonOk, parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const result = await reindexPendingDocuments(user.id);

    return jsonOk({ result });
  } catch (error) {
    return parseRouteError(error);
  }
}
