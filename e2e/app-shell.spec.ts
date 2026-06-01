import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "admin",
      password: "admin123"
    }
  });

  expect(response.ok()).toBe(true);
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/chat$/);
  await page.waitForLoadState("networkidle");
}

async function createChat(page: Page, title: string) {
  return page.evaluate(async (chatTitle) => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: chatTitle })
    });
    const payload = (await response.json()) as { ok: boolean; data?: { chat?: { id: string; title: string } }; error?: { message?: string } };

    if (!response.ok || !payload.ok || !payload.data?.chat) {
      throw new Error(payload.error?.message || "create chat failed");
    }

    return payload.data.chat;
  }, title);
}

async function uploadTextDocument(page: Page, filename: string, content: string) {
  return page.evaluate(
    async ({ uploadFilename, uploadContent }) => {
      const formData = new FormData();
      formData.set("file", new File([uploadContent], uploadFilename, { type: "text/plain" }));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { document?: { id: string; title: string } };
        error?: { message?: string };
      };

      if (!response.ok || !payload.ok || !payload.data?.document) {
        throw new Error(payload.error?.message || "upload document failed");
      }

      const document = payload.data.document;
      const deadline = Date.now() + 10_000;

      while (Date.now() < deadline) {
        const documentsResponse = await fetch("/api/documents");
        const documentsPayload = (await documentsResponse.json()) as {
          ok: boolean;
          data?: { documents?: Array<{ id: string; status: string; _count?: { chunks?: number } }> };
        };
        const current = documentsPayload.data?.documents?.find((item) => item.id === document.id);

        if (current && current.status !== "queued" && current.status !== "processing" && (current._count?.chunks ?? 0) > 0) {
          const previewResponse = await fetch(`/api/documents/${document.id}`);
          const previewPayload = (await previewResponse.json()) as {
            ok: boolean;
            data?: { document?: { chunks?: Array<{ id: string; pageNumber?: number | null }> } };
          };
          return {
            ...document,
            firstChunkId: previewPayload.data?.document?.chunks?.[0]?.id,
            firstPageNumber: previewPayload.data?.document?.chunks?.[0]?.pageNumber
          };
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      throw new Error("document worker did not process upload in time");
    },
    { uploadFilename: filename, uploadContent: content }
  );
}

test.describe("protected routes", () => {
  test("redirects unauthenticated users to login with next path", async ({ page }) => {
    await page.goto("/chat");

    await expect(page).toHaveURL(/\/login\?next=%2Fchat$/);
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
  });

  test("protects the admin diagnostics page", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
  });

  test("redirects authenticated users away from login", async ({ page }) => {
    await login(page);

    await page.goto("/login");
    await expect(page).toHaveURL(/\/chat$/);
  });
});

test.describe("desktop shell", () => {
  test("shows sidebar navigation and chat composer", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop-only shell assertion");

    await login(page);

    await expect(page.getByRole("complementary")).toContainText("Knowledge AI");
    await expect(page.getByRole("button", { name: "แชทใหม่" }).first()).toBeVisible();
    await expect(page.getByLabel("ค้นหาแชท")).toBeVisible();
    await expect(page.getByText("ประวัติแชท", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("ถามอะไรก็ได้")).toBeVisible();
    await expect(page.getByRole("link", { name: "อัปโหลด", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "โทเคน" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ตรวจระบบ" })).toBeVisible();
  });
});

test.describe("admin diagnostics", () => {
  test("shows OpenAI, Chroma, DB, and upload directory statuses", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop-only diagnostics assertion");

    await login(page);
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "ตรวจสถานะระบบ" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "OpenAI" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chroma" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Redis rate limit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ฐานข้อมูล" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ภาพรวมการทำงาน" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "โฟลเดอร์อัปโหลด" })).toBeVisible();
  });
});

test.describe("management actions", () => {
  test("renames and deletes a chat from the sidebar menu", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop-only management assertion");

    await login(page);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const originalTitle = `e2e rename ${suffix}`;
    const renamedTitle = `e2e renamed ${suffix}`;
    await createChat(page, originalTitle);

    await page.goto("/chat");
    await expect(page.getByText(originalTitle, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `จัดการแชท ${originalTitle}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "เปลี่ยนชื่อแชท" }).click();
    const renameDialog = page.getByRole("dialog", { name: "เปลี่ยนชื่อแชท" });
    await renameDialog.getByRole("textbox", { name: "ชื่อแชท" }).fill(renamedTitle);
    await renameDialog.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByText("เปลี่ยนชื่อแชทเรียบร้อย")).toBeVisible();
    await expect(page.getByText(renamedTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(originalTitle, { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: `จัดการแชท ${renamedTitle}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "ลบแชท" }).click();
    await page.getByRole("dialog", { name: "ลบแชท" }).getByRole("button", { name: "ลบแชท" }).click();

    await expect(page.getByText("ลบแชทเรียบร้อย")).toBeVisible();
    await expect(page.getByText(renamedTitle, { exact: true })).toHaveCount(0);
  });

  test("re-indexes and deletes documents from the upload page", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop-only document management assertion");

    await login(page);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const reindexTitle = `e2e-reindex-${suffix}`;
    const deleteTitle = `e2e-delete-${suffix}`;
    await uploadTextDocument(page, `${reindexTitle}.txt`, "Playwright reindex document context for Chroma retry.");
    await uploadTextDocument(page, `${deleteTitle}.txt`, "Playwright delete document context.");

    await page.goto("/upload");
    await expect(page.getByText(reindexTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(deleteTitle, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `re-index Chroma ${reindexTitle}` }).click();
    await expect(page.getByText(/อัปเดตดัชนีแล้ว|ดัชนีเอกสารยังไม่สมบูรณ์|Chroma indexing failed/).first()).toBeVisible();

    await page.getByRole("button", { name: `ลบเอกสาร ${deleteTitle}` }).click();
    await page.getByRole("dialog", { name: "ลบเอกสาร" }).getByRole("button", { name: "ลบเอกสาร" }).click();

    await expect(page.getByText("ลบเอกสารเรียบร้อย")).toBeVisible();
    await expect(page.getByText(deleteTitle, { exact: true })).toHaveCount(0);
  });
});

test.describe("document summary shortcut", () => {
  test("sends the selected document id when clicking the summary button", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop-only summary shortcut assertion");

    await login(page);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const title = `summary-shortcut-${suffix}`;
    const document = await uploadTextDocument(page, `${title}.txt`, "Shortcut summary document context.");
    let chatPayload: { message?: string; documentId?: string } | undefined;

    await page.goto("/chat");
    await expect(page.getByText("ยังไม่เลือกเอกสาร ระบบจะค้นจากทุกไฟล์ที่พร้อมใช้งาน")).toBeVisible();
    await expect(page.getByRole("button", { name: "สรุปเอกสาร" })).toBeDisabled();

    await page.getByLabel("เลือกเอกสารสำหรับ RAG").click();
    await page.getByRole("option", { name: new RegExp(title) }).click();
    await expect(page.getByRole("button", { name: "สรุปเอกสาร" })).toBeEnabled();

    await page.route("**/api/chat", async (route) => {
      chatPayload = JSON.parse(route.request().postData() ?? "{}") as typeof chatPayload;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream; charset=utf-8",
        body: [
          `event: meta\ndata: ${JSON.stringify({ chatId: "summary-shortcut-chat", citations: [] })}`,
          `event: delta\ndata: ${JSON.stringify({ content: "สรุปทดสอบ" })}`,
          `event: done\ndata: ${JSON.stringify({ message: { id: "assistant-1", content: "สรุปทดสอบ" }, usage: {} })}`,
          ""
        ].join("\n\n")
      });
    });

    await page.getByRole("button", { name: "สรุปเอกสาร" }).click();

    await expect
      .poll(() => chatPayload)
      .toMatchObject({
        documentId: document.id,
        message: expect.stringContaining("เอกสารนี้ทั้งหมด")
      });
  });

  test("shows selected document context and clickable citations", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop-only citation assertion");

    await login(page);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const title = `citation-doc-${suffix}`;
    const document = await uploadTextDocument(page, `${title}.txt`, "Citation source text from uploaded document.");

    await page.goto("/chat");
    await page.getByLabel("เลือกเอกสารสำหรับ RAG").click();
    await page.getByRole("option", { name: new RegExp(title) }).click();

    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream; charset=utf-8",
        body: [
          `event: meta\ndata: ${JSON.stringify({
            chatId: "citation-chat",
            citations: [
              {
                index: 1,
                chunkId: document.firstChunkId ?? "chunk-1",
                documentId: document.id,
                title,
                pageNumber: document.firstPageNumber ?? 1,
                chunkIndex: 0,
                excerpt: "Citation source text from uploaded document."
              }
            ]
          })}`,
          `event: delta\ndata: ${JSON.stringify({ content: "คำตอบพร้อมอ้างอิง" })}`,
          `event: done\ndata: ${JSON.stringify({
            message: {
              id: "assistant-citation",
              role: "assistant",
              content: "คำตอบพร้อมอ้างอิง",
              promptTokens: 10,
              outputTokens: 8,
              model: "mock-model",
              citations: [
                {
                  index: 1,
                  chunkId: document.firstChunkId ?? "chunk-1",
                  documentId: document.id,
                  title,
                  pageNumber: document.firstPageNumber ?? 1,
                  chunkIndex: 0,
                  excerpt: "Citation source text from uploaded document."
                }
              ],
              createdAt: new Date().toISOString()
            },
            usage: {}
          })}`,
          ""
        ].join("\n\n")
      });
    });

    await page.getByPlaceholder("ถามอะไรก็ได้").fill("คำถามทดสอบ citation");
    await page.getByRole("button", { name: "ส่งข้อความ" }).click();

    await expect(page.getByText(`กำลังถามจาก: ${title}`)).toBeVisible();
    await expect(page.getByText("คำตอบพร้อมอ้างอิง")).toBeVisible();
    await page.getByRole("button", { name: "อ้างอิง 1" }).click();
    await expect(page.getByRole("dialog", { name: "แหล่งอ้างอิงจากเอกสาร" })).toContainText("Citation source text from uploaded document.");
    await expect(page.getByRole("dialog", { name: "แหล่งอ้างอิงจากเอกสาร" })).toContainText("หน้า 1");
  });
});

test.describe("mobile drawer", () => {
  test("opens sidebar drawer with chat actions and history", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile-only drawer assertion");

    await login(page);

    await expect(page.getByRole("button", { name: "เปิด sidebar" })).toBeVisible();
    await expect(page.getByPlaceholder("ถามอะไรก็ได้")).toBeVisible();
    await page.getByRole("button", { name: "เปิด sidebar" }).click();

    const drawer = page.getByRole("complementary").filter({ hasText: "Knowledge AI" });
    await expect(drawer.getByText("Knowledge AI")).toBeVisible();
    await expect(drawer.getByRole("button", { name: "แชทใหม่" })).toBeVisible();
    await expect(drawer.getByLabel("ค้นหาแชท")).toBeVisible();
    await expect(drawer.getByText("ประวัติแชท", { exact: true })).toBeVisible();

    await drawer.getByRole("button", { name: "ปิด sidebar" }).click();
    await expect(drawer).toBeHidden();
  });

  test("opens the mobile actions menu and navigates to usage", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile-only menu assertion");

    await login(page);

    await page.getByRole("button", { name: "เพิ่มเติม" }).click();
    await expect(page.getByRole("menuitem", { name: "อัปโหลดเอกสาร" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "ตรวจสถานะระบบ" })).toBeVisible();
    await page.getByRole("menuitem", { name: "ดูการใช้งานโทเคน" }).click();
    await expect(page).toHaveURL(/\/usage$/);
    await expect(page.getByRole("heading", { name: "การใช้งานโทเคน" })).toBeVisible();
  });

  test("keeps composer controls usable on mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile-only composer assertion");

    await login(page);

    const composerInput = page.getByPlaceholder("ถามอะไรก็ได้");
    await expect(composerInput).toBeVisible();
    await composerInput.fill("ทดสอบ mobile composer");
    await expect(page.getByRole("button", { name: "ส่งข้อความ" })).toBeEnabled();
    await page.getByLabel("เลือกเอกสารสำหรับ RAG").click();
    await expect(page.getByRole("listbox")).toBeVisible();
  });
});
