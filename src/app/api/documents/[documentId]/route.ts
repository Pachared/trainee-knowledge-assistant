import { deleteDocument } from "@/lib/documents/document-service";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { jsonOk, parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const { documentId } = await context.params;
    await deleteDocument(user.id, documentId);

    return jsonOk({ deleted: true });
  } catch (error) {
    return parseRouteError(error);
  }
}
