import { existsSync, rmSync } from "node:fs";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const cookieJar = vi.hoisted(() => new Map<string, { value: string }>());
const chromaState = vi.hoisted(() => ({
  failWrites: true,
  storedIds: [] as string[]
}));
const openAIState = vi.hoisted(() => ({
  failEmbeddings: false
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => {
      cookieJar.set(name, { value });
    }
  })
}));

vi.mock("chromadb", () => ({
  ChromaClient: class {
    getOrCreateCollection() {
      return Promise.resolve({
        add: async (input: { ids: string[] }) => {
          if (chromaState.failWrites) {
            throw new Error("mock Chroma write failed");
          }
          chromaState.storedIds = Array.from(new Set([...chromaState.storedIds, ...input.ids]));
        },
        delete: async (input?: { where?: { documentId?: string } }) => {
          if (input?.where?.documentId) {
            chromaState.storedIds = chromaState.storedIds.filter((id) => !id.startsWith(`${input.where?.documentId}-`));
            return;
          }

          chromaState.storedIds = [];
        },
        query: async () => ({
          ids: [chromaState.storedIds],
          distances: [chromaState.storedIds.map(() => 0)]
        })
      });
    }
  }
}));

vi.mock("openai", () => ({
  default: class {
    embeddings = {
      create: async () => {
        if (openAIState.failEmbeddings) {
          throw new Error("mock OpenAI diagnostics failed");
        }

        return {
          data: [{ embedding: [0.1, 0.2, 0.3] }]
        };
      }
    };

    responses = {
      create: async function* () {
        yield { type: "response.output_text.delta", delta: "mock OpenAI response" };
        yield {
          type: "response.completed",
          response: {
            model: "gpt-5",
            usage: {
              input_tokens: 10,
              output_tokens: 5,
              total_tokens: 15
            }
          }
        };
      }
    };
  }
}));

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
};

type Routes = {
  loginPost: (request: Request) => Promise<Response>;
  chatSessionPost: (request: Request) => Promise<Response>;
  chatPatch: (request: Request, context: { params: Promise<{ chatId: string }> }) => Promise<Response>;
  chatDelete: (request: Request, context: { params: Promise<{ chatId: string }> }) => Promise<Response>;
  uploadPost: (request: Request) => Promise<Response>;
  documentDelete: (request: Request, context: { params: Promise<{ documentId: string }> }) => Promise<Response>;
  documentReindex: (request: Request, context: { params: Promise<{ documentId: string }> }) => Promise<Response>;
  documentsReindex: (request: Request) => Promise<Response>;
  chatPost: (request: Request) => Promise<Response>;
  usageGet: () => Promise<Response>;
  adminDiagnosticsGet: () => Promise<Response>;
  adminReconcileChromaPost: () => Promise<Response>;
  processDocument: (documentId: string) => Promise<unknown>;
};

const testDbName = `integration-${Date.now()}.db`;
const testDbPath = join(process.cwd(), "prisma", testDbName);
const uploadDir = join(tmpdir(), `trainee-knowledge-uploads-${Date.now()}`);

async function parseJson<T>(response: Response) {
  return (await response.json()) as ApiEnvelope<T>;
}

async function uploadFile(routes: Routes, file: File) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await routes.uploadPost(
    new Request("http://test.local/api/upload", {
      method: "POST",
      body: formData
    })
  );

  return {
    response,
    payload: await parseJson<{
      document: {
        id: string;
        status: string;
        failedReason?: string | null;
        chunks: Array<{ id: string }>;
      };
    }>(response)
  };
}

async function processUpload(routes: Routes, upload: Awaited<ReturnType<typeof uploadFile>>) {
  const documentId = upload.payload.data?.document.id;
  expect(documentId).toEqual(expect.any(String));
  await routes.processDocument(documentId ?? "");

  return prismaDocument(documentId ?? "");
}

async function prismaDocument(documentId: string) {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      chunks: {
        select: { id: true }
      }
    }
  });
}

async function applyMigration() {
  const setupPrisma = new PrismaClient();
  const migrationsDir = join(process.cwd(), "prisma/migrations");
  const migrationFiles = (await readdir(migrationsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(migrationsDir, entry.name, "migration.sql"))
    .sort();

  try {
    for (const migrationFile of migrationFiles) {
      const migration = await readFile(migrationFile, "utf8");
      const statements = migration
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await setupPrisma.$executeRawUnsafe(statement);
      }
    }
  } finally {
    await setupPrisma.$disconnect();
  }
}

describe("knowledge assistant API flow", () => {
  let routes: Routes;
  let prisma: typeof import("@/lib/db/prisma").prisma;

  beforeAll(async () => {
    process.env.DATABASE_URL = `file:./${testDbName}`;
    process.env.MOCK_ADMIN_USERNAME = "admin";
    process.env.MOCK_ADMIN_PASSWORD = "admin123";
    process.env.SESSION_SECRET = "integration-session-secret-change-me-32";
    process.env.CHROMA_URL = "http://127.0.0.1:65535";
    process.env.UPLOAD_DIR = uploadDir;
    process.env.OPENAI_API_KEY = "";

    await mkdir(uploadDir, { recursive: true });
    await applyMigration();

    const [
      loginRoute,
      chatsRoute,
      chatActionsRoute,
      uploadRoute,
      documentActionsRoute,
      documentReindexRoute,
      documentsReindexRoute,
      chatRoute,
      usageRoute,
      adminDiagnosticsRoute,
      adminReconcileChromaRoute,
      documentService,
      db
    ] =
      await Promise.all([
      import("@/app/api/auth/login/route"),
      import("@/app/api/chats/route"),
      import("@/app/api/chats/[chatId]/route"),
      import("@/app/api/upload/route"),
      import("@/app/api/documents/[documentId]/route"),
      import("@/app/api/documents/[documentId]/reindex/route"),
      import("@/app/api/documents/reindex/route"),
      import("@/app/api/chat/route"),
      import("@/app/api/usage/route"),
      import("@/app/api/admin/diagnostics/route"),
      import("@/app/api/admin/reconcile-chroma/route"),
      import("@/lib/documents/document-service"),
      import("@/lib/db/prisma")
    ]);

    routes = {
      loginPost: loginRoute.POST,
      chatSessionPost: chatsRoute.POST,
      chatPatch: chatActionsRoute.PATCH,
      chatDelete: chatActionsRoute.DELETE,
      uploadPost: uploadRoute.POST,
      documentDelete: documentActionsRoute.DELETE,
      documentReindex: documentReindexRoute.POST,
      documentsReindex: documentsReindexRoute.POST,
      chatPost: chatRoute.POST,
      usageGet: usageRoute.GET,
      adminDiagnosticsGet: adminDiagnosticsRoute.GET,
      adminReconcileChromaPost: adminReconcileChromaRoute.POST,
      processDocument: documentService.processDocument
    };
    prisma = db.prisma;
  }, 30_000);

  afterAll(async () => {
    await prisma?.$disconnect();

    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true });
    }
    if (existsSync(uploadDir)) {
      rmSync(uploadDir, { recursive: true, force: true });
    }
    cookieJar.clear();
  });

  it("logs in, uploads TXT/PDF, chats with a document, and records usage", async () => {
    const loginResponse = await routes.loginPost(
      new Request("http://test.local/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin123" })
      })
    );
    const loginPayload = await parseJson<{ user: { id: string; username: string } }>(loginResponse);

    expect(loginResponse.status).toBe(200);
    expect(loginPayload.data?.user.username).toBe("admin");
    expect(cookieJar.get(SESSION_COOKIE_NAME)?.value).toEqual(expect.any(String));

    const txtUpload = await uploadFile(
      routes,
      new File(["Prisma SQLite Chroma integration context for uploaded text."], "rag-notes.txt", {
        type: "text/plain"
      })
    );

    expect(txtUpload.response.status).toBe(201);
    expect(txtUpload.payload.data?.document.status).toBe("queued");
    const processedTxtDocument = await processUpload(routes, txtUpload);
    expect(processedTxtDocument.status).toMatch(/^ready/);
    expect(processedTxtDocument.chunks.length).toBeGreaterThan(0);
    expect(processedTxtDocument.failedReason).toEqual(expect.any(String));

    const pdfFixture = await readFile(join(process.cwd(), "node_modules/pdf-parse/test/data/01-valid.pdf"));
    const pdfUpload = await uploadFile(
      routes,
      new File([pdfFixture], "fixture.pdf", {
        type: "application/pdf"
      })
    );

    expect(pdfUpload.response.status).toBe(201);
    expect(pdfUpload.payload.data?.document.status).toBe("queued");
    const processedPdfDocument = await processUpload(routes, pdfUpload);
    expect(processedPdfDocument.status).toMatch(/^ready/);
    expect(processedPdfDocument.chunks.length).toBeGreaterThan(0);
    expect(processedPdfDocument.failedReason).toEqual(expect.any(String));

    const failedPdf = await uploadFile(
      routes,
      new File([Buffer.from("%PDF-1.4\nbroken pdf content")], "broken.pdf", {
        type: "application/pdf"
      })
    );

    expect(failedPdf.response.status).toBe(201);
    expect(failedPdf.payload.data?.document.status).toBe("queued");
    await processUpload(routes, failedPdf);

    const storedFailedPdf = await prisma.document.findFirstOrThrow({
      where: { filename: { contains: "broken" } },
      orderBy: { createdAt: "desc" }
    });

    expect(storedFailedPdf.status).toBe("failed");
    expect(storedFailedPdf.failedReason).toEqual(expect.any(String));
    expect(storedFailedPdf.failedReason?.length).toBeGreaterThan(0);

    const reindexResponse = await routes.documentReindex(
      new Request(`http://test.local/api/documents/${txtUpload.payload.data?.document.id}/reindex`, {
        method: "POST"
      }),
      { params: Promise.resolve({ documentId: txtUpload.payload.data?.document.id ?? "" }) }
    );
    const reindexPayload = await parseJson<{ document: { id: string; status: string; failedReason?: string | null } }>(
      reindexResponse
    );
    const reindexDetails = reindexPayload.error?.details as
      | { document?: { id: string; status: string; failedReason?: string | null } }
      | undefined;

    expect(reindexResponse.status).toBe(400);
    expect(reindexDetails?.document?.status).toBe("ready_without_chroma");
    expect(reindexDetails?.document?.failedReason).toContain("Chroma indexing failed");

    chromaState.failWrites = false;

    const successfulReindexResponse = await routes.documentReindex(
      new Request(`http://test.local/api/documents/${txtUpload.payload.data?.document.id}/reindex`, {
        method: "POST"
      }),
      { params: Promise.resolve({ documentId: txtUpload.payload.data?.document.id ?? "" }) }
    );
    const successfulReindexPayload = await parseJson<{
      document: { id: string; status: string; failedReason?: string | null };
    }>(successfulReindexResponse);

    expect(successfulReindexResponse.status).toBe(200);
    expect(successfulReindexPayload.data?.document.status).toBe("ready");
    expect(successfulReindexPayload.data?.document.failedReason).toBeNull();

    const reindexedDocument = await prisma.document.findUniqueOrThrow({
      where: { id: txtUpload.payload.data?.document.id }
    });

    expect(reindexedDocument.status).toBe("ready");
    expect(reindexedDocument.failedReason).toBeNull();
    expect(chromaState.storedIds.length).toBeGreaterThan(0);

    chromaState.failWrites = true;
    const pendingReindexUpload = await uploadFile(
      routes,
      new File(["Bulk re-index should move this document back to ready."], "bulk-reindex.txt", {
        type: "text/plain"
      })
    );

    expect(pendingReindexUpload.response.status).toBe(201);
    expect(pendingReindexUpload.payload.data?.document.status).toBe("queued");
    const processedPendingReindexDocument = await processUpload(routes, pendingReindexUpload);
    expect(processedPendingReindexDocument.status).toBe("ready_without_chroma");

    chromaState.failWrites = false;
    const bulkReindexResponse = await routes.documentsReindex(
      new Request("http://test.local/api/documents/reindex", {
        method: "POST"
      })
    );
    const bulkReindexPayload = await parseJson<{
      result: {
        total: number;
        succeeded: number;
        failed: number;
        documents: Array<{ id: string; status: string; failedReason?: string | null }>;
      };
    }>(bulkReindexResponse);

    expect(bulkReindexResponse.status).toBe(200);
    expect(bulkReindexPayload.data?.result.total).toBeGreaterThanOrEqual(1);
    expect(bulkReindexPayload.data?.result.succeeded).toBeGreaterThanOrEqual(1);
    expect(bulkReindexPayload.data?.result.failed).toBe(0);
    expect(
      bulkReindexPayload.data?.result.documents.find((document) => document.id === pendingReindexUpload.payload.data?.document.id)
    ).toMatchObject({ status: "ready", failedReason: null });

    chromaState.storedIds = [];
    const reconcileResponse = await routes.adminReconcileChromaPost();
    const reconcilePayload = await parseJson<{
      result: {
        total: number;
        succeeded: number;
        failed: number;
      };
    }>(reconcileResponse);

    expect(reconcileResponse.status).toBe(200);
    expect(reconcilePayload.data?.result.total).toBeGreaterThanOrEqual(2);
    expect(reconcilePayload.data?.result.succeeded).toBe(reconcilePayload.data?.result.total);
    expect(reconcilePayload.data?.result.failed).toBe(0);
    expect(chromaState.storedIds.length).toBeGreaterThan(0);

    const longDocumentText = Array.from({ length: 9 }, (_, index) =>
      [
        `หัวข้อที่ ${index + 1}`,
        "เนื้อหาสำหรับทดสอบการสรุปทั้งเอกสาร ต้องถูกส่งเข้า context เมื่อผู้ใช้ขอสรุปเอกสารทั้งหมด",
        "รายละเอียดเพิ่มเติมเกี่ยวกับ Prisma SQLite Chroma OpenAI และการทำ RAG ในระบบนี้".repeat(18)
      ].join("\n")
    ).join("\n\n");
    const longDocumentUpload = await uploadFile(
      routes,
      new File([longDocumentText], "long-summary.txt", {
        type: "text/plain"
      })
    );

    expect(longDocumentUpload.response.status).toBe(201);
    expect(longDocumentUpload.payload.data?.document.status).toBe("queued");
    const processedLongDocument = await processUpload(routes, longDocumentUpload);
    expect(processedLongDocument.chunks.length).toBeGreaterThan(5);

    const summaryResponse = await routes.chatPost(
      new Request("http://test.local/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: longDocumentUpload.payload.data?.document.id,
          message: "ช่วยสรุปเอกสารนี้ทั้งหมด"
        })
      })
    );
    const summaryEvents = await summaryResponse.text();

    expect(summaryResponse.status).toBe(200);
    expect(summaryEvents).toContain('"index":6');
    expect(summaryEvents.match(/long-summary/g)?.length).toBeGreaterThan(5);

    const chatResponse = await routes.chatPost(
      new Request("http://test.local/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: txtUpload.payload.data?.document.id,
          message: "Prisma ใช้ทำอะไรในเอกสารนี้"
        })
      })
    );
    const chatEvents = await chatResponse.text();

    expect(chatResponse.status).toBe(200);
    expect(chatEvents).toContain("event: meta");
    expect(chatEvents).toContain("event: done");
    expect(chatEvents).toContain("rag-notes");

    const usageResponse = await routes.usageGet();
    const usagePayload = await parseJson<{
      usage: Array<{
        messageCount: number;
        totalTokens: number;
      }>;
    }>(usageResponse);

    expect(usageResponse.status).toBe(200);
    expect(usagePayload.data?.usage.length).toBeGreaterThan(0);
    expect(usagePayload.data?.usage[0]?.messageCount).toBeGreaterThan(0);
    expect(usagePayload.data?.usage[0]?.totalTokens).toBeGreaterThan(0);

    const manualChatResponse = await routes.chatSessionPost(
      new Request("http://test.local/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "ชื่อเดิม" })
      })
    );
    const manualChatPayload = await parseJson<{ chat: { id: string; title: string } }>(manualChatResponse);
    const manualChatId = manualChatPayload.data?.chat.id ?? "";

    const renameResponse = await routes.chatPatch(
      new Request(`http://test.local/api/chats/${manualChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "ชื่อใหม่" })
      }),
      { params: Promise.resolve({ chatId: manualChatId }) }
    );
    const renamePayload = await parseJson<{ chat: { id: string; title: string } }>(renameResponse);

    expect(renameResponse.status).toBe(200);
    expect(renamePayload.data?.chat.title).toBe("ชื่อใหม่");

    const deleteChatResponse = await routes.chatDelete(
      new Request(`http://test.local/api/chats/${manualChatId}`, { method: "DELETE" }),
      { params: Promise.resolve({ chatId: manualChatId }) }
    );

    expect(deleteChatResponse.status).toBe(200);
    await expect(prisma.chatSession.findFirstOrThrow({ where: { id: manualChatId } })).rejects.toThrow();

    const deleteDocumentResponse = await routes.documentDelete(
      new Request(`http://test.local/api/documents/${pdfUpload.payload.data?.document.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ documentId: pdfUpload.payload.data?.document.id ?? "" }) }
    );

    expect(deleteDocumentResponse.status).toBe(200);
    await expect(
      prisma.document.findFirstOrThrow({ where: { id: pdfUpload.payload.data?.document.id } })
    ).rejects.toThrow();
  }, 30_000);

  it("reports admin diagnostics for Chroma, DB migrations, and upload directory writability", async () => {
    chromaState.failWrites = false;
    process.env.OPENAI_API_KEY = "test-openai-key";

    const response = await routes.adminDiagnosticsGet();
    const payload = await parseJson<{
      chroma: { status: string; url: string; collection: string };
      database: { status: string; migrationCount: number };
      openai: {
        status: string;
        keyConfigured: boolean;
        keyCount: number;
        model: string;
        embeddingModel: string;
        liveStatus: string;
      };
      redis: { status: string; configured: boolean };
      metrics: {
        status: string;
        documentsByStatus: Record<string, number>;
        staleProcessing: number;
        totalTokens: number;
      };
      uploadDirectory: { status: string; path: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.data?.chroma.status).toBe("ok");
    expect(payload.data?.database.status).toBe("ok");
    expect(payload.data?.database.migrationCount).toBeGreaterThan(0);
    expect(payload.data?.openai.status).toBe("ok");
    expect(payload.data?.openai.keyConfigured).toBe(true);
    expect(payload.data?.openai.keyCount).toBe(1);
    expect(payload.data?.openai.model).toBe("gpt-5");
    expect(payload.data?.openai.embeddingModel).toBe("text-embedding-3-small");
    expect(payload.data?.openai.liveStatus).toBe("ok");
    expect(payload.data?.redis.status).toBe("warning");
    expect(payload.data?.redis.configured).toBe(false);
    expect(payload.data?.metrics.status).toBe("ok");
    expect(payload.data?.metrics.documentsByStatus.ready).toBeGreaterThanOrEqual(0);
    expect(payload.data?.metrics.staleProcessing).toBeGreaterThanOrEqual(0);
    expect(payload.data?.metrics.totalTokens).toBeGreaterThanOrEqual(0);
    expect(payload.data?.uploadDirectory.status).toBe("ok");
    expect(payload.data?.uploadDirectory.path).toBe(uploadDir);

    openAIState.failEmbeddings = true;
    const failedOpenAIResponse = await routes.adminDiagnosticsGet();
    const failedOpenAIPayload = await parseJson<{
      openai: { status: string; liveStatus: string; message?: string };
    }>(failedOpenAIResponse);

    expect(failedOpenAIResponse.status).toBe(200);
    expect(failedOpenAIPayload.data?.openai.status).toBe("error");
    expect(failedOpenAIPayload.data?.openai.liveStatus).toBe("error");
    expect(failedOpenAIPayload.data?.openai.message).toContain("mock OpenAI diagnostics failed");

    openAIState.failEmbeddings = false;
    process.env.OPENAI_API_KEY = "";
  });

  it("enforces per-user upload and chat quotas", async () => {
    process.env.MAX_DOCUMENTS_PER_USER = "0";

    const uploadBlocked = await uploadFile(
      routes,
      new File(["quota blocked content"], "quota-blocked.txt", {
        type: "text/plain"
      })
    );

    expect(uploadBlocked.response.status).toBe(429);
    expect(uploadBlocked.payload.error?.message).toContain("quota");

    process.env.MAX_DOCUMENTS_PER_USER = "";
    process.env.MAX_DAILY_CHAT_MESSAGES_PER_USER = "0";

    const chatBlocked = await routes.chatPost(
      new Request("http://test.local/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "This should be blocked by chat quota"
        })
      })
    );
    const chatBlockedPayload = await parseJson(chatBlocked);

    expect(chatBlocked.status).toBe(429);
    expect(chatBlockedPayload.error?.message).toContain("quota");

    process.env.MAX_DAILY_CHAT_MESSAGES_PER_USER = "";
  });
});
