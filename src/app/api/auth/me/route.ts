import { getCurrentUser } from "@/lib/auth/current-user";
import { jsonOk } from "@/lib/http/response";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  return jsonOk({ user });
}
