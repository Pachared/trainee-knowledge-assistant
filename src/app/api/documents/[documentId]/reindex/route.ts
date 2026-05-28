import { reindexDocument } from "@/lib/documents/document-service";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { jsonError, jsonOk, parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const { documentId } = await context.params;
    const document = await reindexDocument(user.id, documentId);

    return jsonOk({ document });
  } catch (error) {
    if (error instanceof Error && "document" in error) {
      return jsonError(error.message, 400, { document: (error as Error & { document: unknown }).document });
    }

    return parseRouteError(error);
  }
}
