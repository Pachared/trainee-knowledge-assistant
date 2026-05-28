import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      createdAt: true
    }
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");
  }

  return user;
}
