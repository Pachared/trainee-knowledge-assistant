import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { jsonOk } from "@/lib/http/response";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return jsonOk({ loggedOut: true });
}
