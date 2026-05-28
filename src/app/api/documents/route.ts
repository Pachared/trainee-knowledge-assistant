import { requireCurrentUser } from "@/lib/auth/current-user";
import { listDocuments } from "@/lib/documents/document-service";
import { jsonOk, parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const documents = await listDocuments(user.id);

    return jsonOk({ documents });
  } catch (error) {
    return parseRouteError(error);
  }
}
