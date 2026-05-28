import { requireCurrentUser } from "@/lib/auth/current-user";
import { getUsageSummary } from "@/lib/usage/usage-service";
import { jsonOk, parseRouteError } from "@/lib/http/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const usage = await getUsageSummary(user.id);

    return jsonOk({ usage });
  } catch (error) {
    return parseRouteError(error);
  }
}
