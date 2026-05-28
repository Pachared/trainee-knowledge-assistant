import { existsSync, rmSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
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
  };
};

type Routes = {
  loginPost: (request: Request) => Promise<Response>;
  uploadPost: (request: Request) => Promise<Response>;
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
        chunks: Array<{ id: string }>;
      };
    }>(response)
  };
}

async function applyMigration() {
  const setupPrisma = new PrismaClient();
  const migration = await readFile(
    join(process.cwd(), "prisma/migrations/20260528172000_init/migration.sql"),
    "utf8"
  );
  const statements = migration
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  try {
    for (const statement of statements) {
      await setupPrisma.$executeRawUnsafe(statement);
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

    const [loginRoute, uploadRoute, chatRoute, usageRoute, db] = await Promise.all([
      import("@/app/api/auth/login/route"),
      import("@/app/api/upload/route"),
      import("@/app/api/chat/route"),
      import("@/app/api/usage/route"),
      import("@/lib/db/prisma")
    ]);

    routes = {
      loginPost: loginRoute.POST,
      uploadPost: uploadRoute.POST,
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
  }, 30_000);
});
