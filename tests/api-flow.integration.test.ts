import { existsSync, rmSync } from "node:fs";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const cookieJar = vi.hoisted(() => new Map<string, { value: string }>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => {
      cookieJar.set(name, { value });
    }
  })
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
  chatPost: (request: Request) => Promise<Response>;
  usageGet: () => Promise<Response>;
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

    await mkdir(uploadDir, { recursive: true });
    await applyMigration();

    const [loginRoute, chatsRoute, chatActionsRoute, uploadRoute, documentActionsRoute, documentReindexRoute, chatRoute, usageRoute, db] =
      await Promise.all([
      import("@/app/api/auth/login/route"),
      import("@/app/api/chats/route"),
      import("@/app/api/chats/[chatId]/route"),
      import("@/app/api/upload/route"),
      import("@/app/api/documents/[documentId]/route"),
      import("@/app/api/documents/[documentId]/reindex/route"),
      import("@/app/api/chat/route"),
      import("@/app/api/usage/route"),
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
      chatPost: chatRoute.POST,
      usageGet: usageRoute.GET
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
    expect(txtUpload.payload.data?.document.status).toMatch(/^ready/);
    expect(txtUpload.payload.data?.document.chunks.length).toBeGreaterThan(0);
    expect(txtUpload.payload.data?.document.failedReason).toEqual(expect.any(String));

    const pdfFixture = await readFile(join(process.cwd(), "node_modules/pdf-parse/test/data/01-valid.pdf"));
    const pdfUpload = await uploadFile(
      routes,
      new File([pdfFixture], "fixture.pdf", {
        type: "application/pdf"
      })
    );

    expect(pdfUpload.response.status).toBe(201);
    expect(pdfUpload.payload.data?.document.status).toMatch(/^ready/);
    expect(pdfUpload.payload.data?.document.chunks.length).toBeGreaterThan(0);
    expect(pdfUpload.payload.data?.document.failedReason).toEqual(expect.any(String));

    const failedPdf = await uploadFile(
      routes,
      new File([Buffer.from("%PDF-1.4\nbroken pdf content")], "broken.pdf", {
        type: "application/pdf"
      })
    );

    expect(failedPdf.response.status).toBe(400);
    expect(failedPdf.payload.error?.message).toEqual(expect.any(String));

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
});
