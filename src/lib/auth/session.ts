import { SignJWT, jwtVerify } from "jose";
import { getCookieSecure, getSessionSecret } from "@/lib/env";

export const SESSION_COOKIE_NAME = "trainee_knowledge_session";

export type SessionPayload = {
  userId: string;
  username: string;
};

function secretKey() {
  return new TextEncoder().encode(getSessionSecret());
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(token?: string): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, secretKey());
    const payload = verified.payload;

    if (typeof payload.userId !== "string" || typeof payload.username !== "string") {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getCookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  };
}
