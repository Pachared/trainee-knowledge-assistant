import { access, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getChromaConfig, getOpenAIKeys } from "@/lib/env";
import { getUploadDir } from "@/lib/documents/file-storage";
import { getChromaCollection } from "@/lib/rag/chroma";
import { getOpenAIClient, getOpenAIEmbeddingModel, getOpenAIModel } from "@/lib/ai/openai-client";

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

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function checkOpenAI() {
  const keys = getOpenAIKeys();
  const model = getOpenAIModel();
  const embeddingModel = getOpenAIEmbeddingModel();

  if (!keys.length) {
    return {
      status: "warning" as DiagnosticStatus,
      keyConfigured: false,
      keyCount: 0,
      model,
      embeddingModel,
      liveStatus: "skipped"
    };
  }

  const client = getOpenAIClient();

  if (!client) {
    return {
      status: "warning" as DiagnosticStatus,
      keyConfigured: true,
      keyCount: keys.length,
      model,
      embeddingModel,
      liveStatus: "skipped",
      message: "OpenAI client could not be initialized."
    };
  }

  try {
    await withTimeout(
      client.embeddings.create({
        model: embeddingModel,
        input: "diagnostics"
      }),
      8_000,
      "OpenAI diagnostics"
    );

    return {
      status: "ok" as DiagnosticStatus,
      keyConfigured: true,
      keyCount: keys.length,
      model,
      embeddingModel,
      liveStatus: "ok"
    };
  } catch (error) {
    return {
      status: "error" as DiagnosticStatus,
      keyConfigured: true,
      keyCount: keys.length,
      model,
      embeddingModel,
      liveStatus: "error",
      message: errorMessage(error)
    };
  }
}

export async function getAdminDiagnostics() {
  const [chroma, database, uploadDirectory, openai] = await Promise.all([
    checkChroma(),
    checkDatabaseMigrations(),
    checkUploadDirectory(),
    checkOpenAI()
  ]);

  return {
    chroma,
    database,
    openai,
    uploadDirectory
  };
}
