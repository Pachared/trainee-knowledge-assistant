import { access, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getChromaConfig, getOpenAIKeys } from "@/lib/env";
import { getUploadDir } from "@/lib/documents/file-storage";
import { getChromaCollection } from "@/lib/rag/chroma";
import { getOpenAIEmbeddingModel, getOpenAIModel } from "@/lib/ai/openai-client";

type DiagnosticStatus = "ok" | "warning" | "error";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function checkChroma() {
  const config = getChromaConfig();

  try {
    await getChromaCollection();
    return {
      status: "ok" as DiagnosticStatus,
      url: config.url,
      collection: config.collection
    };
  } catch (error) {
    return {
      status: "error" as DiagnosticStatus,
      url: config.url,
      collection: config.collection,
      message: errorMessage(error)
    };
  }
}

async function checkDatabaseMigrations() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const migrationCount = (
    await readdir(migrationsDir, { withFileTypes: true }).catch(() => [])
  ).filter((entry) => entry.isDirectory()).length;

  try {
    await prisma.$queryRaw`SELECT 1`;
    const appliedRows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(*) as count FROM _prisma_migrations
    `.catch(() => []);
    const appliedCount = Number(appliedRows[0]?.count ?? 0);

    return {
      status: (appliedCount > 0 || migrationCount > 0 ? "ok" : "warning") as DiagnosticStatus,
      migrationCount,
      appliedCount
    };
  } catch (error) {
    return {
      status: "error" as DiagnosticStatus,
      migrationCount,
      appliedCount: 0,
      message: errorMessage(error)
    };
  }
}

async function checkUploadDirectory() {
  const uploadDir = getUploadDir();
  const probePath = path.join(uploadDir, `.diagnostic-${randomUUID()}`);

  try {
    await mkdir(uploadDir, { recursive: true });
    await access(uploadDir, constants.W_OK);
    await writeFile(probePath, "ok");
    await unlink(probePath);

    return {
      status: "ok" as DiagnosticStatus,
      path: uploadDir
    };
  } catch (error) {
    return {
      status: "error" as DiagnosticStatus,
      path: uploadDir,
      message: errorMessage(error)
    };
  }
}

function checkOpenAI() {
  const keys = getOpenAIKeys();

  return {
    status: (keys.length ? "ok" : "warning") as DiagnosticStatus,
    keyConfigured: keys.length > 0,
    keyCount: keys.length,
    model: getOpenAIModel(),
    embeddingModel: getOpenAIEmbeddingModel()
  };
}

export async function getAdminDiagnostics() {
  const [chroma, database, uploadDirectory] = await Promise.all([
    checkChroma(),
    checkDatabaseMigrations(),
    checkUploadDirectory()
  ]);

  return {
    chroma,
    database,
    openai: checkOpenAI(),
    uploadDirectory
  };
}
