import { readFile } from "node:fs/promises";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { documentId } = await context.params;
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id
      }
    });

    if (!document) {
      throw new Error("ไม่พบเอกสารนี้");
    }

    const file = await readFile(document.path);

    return new Response(file, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.filename)}"`
      }
    });
  } catch (error) {
    return parseRouteError(error);
  }
}
