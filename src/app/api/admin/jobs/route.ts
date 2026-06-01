import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { cancelDocumentJob, listDocumentJobs, retryDocumentJob } from "@/lib/documents/document-service";
import { jsonOk, parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

const jobActionSchema = z.object({
  action: z.enum(["retry", "cancel"]),
  documentId: z.string().min(1)
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const jobs = await listDocumentJobs(user.id);

    return jsonOk({ jobs });
  } catch (error) {
    return parseRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = jobActionSchema.parse(await request.json());
    const job = body.action === "retry"
      ? await retryDocumentJob(user.id, body.documentId)
      : await cancelDocumentJob(user.id, body.documentId);

    return jsonOk({ job });
  } catch (error) {
    return parseRouteError(error);
  }
}
