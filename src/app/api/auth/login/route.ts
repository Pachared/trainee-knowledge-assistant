import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validation/schemas";
import { verifyMockPassword } from "@/lib/auth/mock-user";
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session";
import { jsonError, jsonOk, parseRouteError } from "@/lib/http/response";
import { clientIpFromHeaders } from "@/lib/security/input";
import { globalRateLimiter } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const limit = globalRateLimiter.check(`login:${clientIpFromHeaders(request.headers)}`);
    if (!limit.allowed) {
      return jsonError("ลองใหม่อีกครั้งภายหลัง", 429, { resetAt: limit.resetAt });
    }

    const body = loginSchema.parse(await request.json());
    const user = await verifyMockPassword(body.password);

    if (!user || user.username !== body.username) {
      return jsonError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", 401);
    }

    const token = await createSessionToken({ userId: user.id, username: user.username });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());

    return jsonOk({
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    return parseRouteError(error);
  }
}
