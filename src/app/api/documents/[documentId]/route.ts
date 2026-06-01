import { deleteDocument, getDocumentPreview } from "@/lib/documents/document-service";
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

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const { documentId } = await context.params;
    const url = new URL(request.url);
    const document = await getDocumentPreview(user.id, documentId, url.searchParams.get("chunkId") ?? undefined);

    return jsonOk({
      document: {
        id: document.id,
        title: document.title,
        filename: document.filename,
        mimeType: document.mimeType,
        status: document.status,
        failedReason: document.failedReason,
        jobStage: document.jobStage,
        jobProgress: document.jobProgress,
        chunks: document.chunks.map((chunk) => ({
          id: chunk.id,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          content: chunk.content
        })),
        chunkCount: document._count.chunks
      }
    });
  } catch (error) {
    return parseRouteError(error);
  }
}
