import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { getRequiredEnv } from "@/lib/env";

export async function ensureMockUser() {
  const username = getRequiredEnv("MOCK_ADMIN_USERNAME");
  const password = getRequiredEnv("MOCK_ADMIN_PASSWORD");
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      username,
      passwordHash
    }
  });
}

export async function verifyMockPassword(password: string) {
  const user = await ensureMockUser();
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}
