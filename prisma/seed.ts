import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function readSecret(name: string) {
  const filePath = process.env[`${name}_FILE`]?.trim();

  if (filePath) {
    return readFileSync(filePath, "utf8").trim();
  }

  return process.env[name];
}

async function main() {
  const username = readSecret("MOCK_ADMIN_USERNAME");
  const password = readSecret("MOCK_ADMIN_PASSWORD");

  if (!username || !password) {
    throw new Error("MOCK_ADMIN_USERNAME and MOCK_ADMIN_PASSWORD are required for seed.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
