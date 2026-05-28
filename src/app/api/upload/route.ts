import { requireCurrentUser } from "@/lib/auth/current-user";
import { uploadDocument } from "@/lib/documents/document-service";
import { jsonError, jsonOk, parseRouteError } from "@/lib/http/response";
import { clientIpFromHeaders } from "@/lib/security/input";
import { uploadRateLimiter } from "@/lib/security/rate-limit";
import { assertUploadQuota } from "@/lib/security/quota";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const limit = uploadRateLimiter.check(`upload:${user.id}:${clientIpFromHeaders(request.headers)}`);

    if (!limit.allowed) {
      return jsonError("อัปโหลดถี่เกินไป กรุณาลองใหม่ภายหลัง", 429, { resetAt: limit.resetAt });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("กรุณาเลือกไฟล์ PDF หรือ TXT", 422);
    }

    await assertUploadQuota(user.id, file.size);
    const document = await uploadDocument(user.id, file);
    return jsonOk({ document }, { status: 201 });
  } catch (error) {
    return parseRouteError(error);
  }
}
