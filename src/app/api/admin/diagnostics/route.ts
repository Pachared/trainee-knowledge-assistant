import { getAdminDiagnostics } from "@/lib/admin/diagnostics";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { jsonOk, parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireCurrentUser();
    const diagnostics = await getAdminDiagnostics();

    return jsonOk(diagnostics);
  } catch (error) {
    return parseRouteError(error);
  }
}
