import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const prismaDir = join(process.cwd(), "prisma");
const patterns = [/^integration-e2e-.*\.db$/, /^integration-e2e-.*\.db-journal$/];
const entries = await readdir(prismaDir).catch(() => []);
const staleFiles = entries.filter((entry) => patterns.some((pattern) => pattern.test(entry)));

await Promise.all(staleFiles.map((entry) => rm(join(prismaDir, entry), { force: true })));

console.log(`Removed ${staleFiles.length} e2e SQLite file${staleFiles.length === 1 ? "" : "s"}.`);
