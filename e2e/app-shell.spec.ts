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

test.describe("protected routes", () => {
  test("redirects unauthenticated users to login with next path", async ({ page }) => {
    await page.goto("/chat");

    await expect(page).toHaveURL(/\/login\?next=%2Fchat$/);
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
  });
});

test.describe("mobile drawer", () => {
  test("opens sidebar drawer with chat actions and history", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile-only drawer assertion");

    await login(page);

    await expect(page.getByRole("button", { name: "เปิด sidebar" })).toBeVisible();
    await expect(page.getByPlaceholder("ถามอะไรก็ได้")).toBeVisible();
    await page.getByRole("button", { name: "เปิด sidebar" }).tap();

    const drawer = page.getByRole("presentation").filter({ hasText: "Knowledge AI" });
    await expect(drawer.getByText("Knowledge AI")).toBeVisible();
    await expect(drawer.getByRole("button", { name: "แชทใหม่" })).toBeVisible();
    await expect(drawer.getByLabel("ค้นหาแชท")).toBeVisible();
    await expect(drawer.getByText("ประวัติแชท", { exact: true })).toBeVisible();

    await drawer.getByRole("button", { name: "ปิด sidebar" }).click();
    await expect(drawer).toBeHidden();
  });
});
