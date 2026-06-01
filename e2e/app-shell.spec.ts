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
          return document;
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
    await expect(page.getByRole("heading", { name: "เข้าสู่ Trainee Knowledge Assistant" })).toBeVisible();
  });

  test("protects the admin diagnostics page", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
    await expect(page.getByRole("heading", { name: "เข้าสู่ Trainee Knowledge Assistant" })).toBeVisible();
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
    await expect(page.getByRole("link", { name: "อัปโหลด" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Token usage" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Diagnostics" })).toBeVisible();
  });
});

test.describe("admin diagnostics", () => {
  test("shows OpenAI, Chroma, DB, and upload directory statuses", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop-only diagnostics assertion");

    await login(page);
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Admin diagnostics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "OpenAI" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chroma" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Redis rate limit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Database" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational metrics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upload directory" })).toBeVisible();
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
    await expect(page.getByText(/re-index Chroma|Chroma indexing failed/).first()).toBeVisible();

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
    await expect(page.getByText("เลือกเอกสารก่อนสรุป")).toBeVisible();
    await expect(page.getByRole("button", { name: "สรุปเอกสาร" })).toBeDisabled();

    await page.getByLabel("เลือกเอกสารสำหรับ RAG").click();
    await page.getByRole("option", { name: title }).click();
    await expect(page.getByText("พร้อมสรุปเอกสารที่เลือก")).toBeVisible();

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
});
