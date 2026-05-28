import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.MOCK_ADMIN_USERNAME;
  const password = process.env.MOCK_ADMIN_PASSWORD;

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
