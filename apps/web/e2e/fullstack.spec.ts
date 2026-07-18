import { test, expect } from "@playwright/test";

test("authenticated local-first project, versions, scenarios, reports and read-only sharing", async ({ page, context }, testInfo) => {
  test.skip(process.env.E2E_FULLSTACK !== "1" || testInfo.project.name !== "desktop", "requires the real ASP.NET API");
  const email = `e2e-${Date.now()}@example.test`;
  await page.goto("/account");
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill("Valid!Password123");
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page.getByText(email)).toBeVisible();
  await page.goto("/projects");
  await page.getByRole("button", { name: "Dùng dự án mẫu" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/setup$/);
  const projectId = page.url().split("/").at(-2)!;

  await page.locator(".room-rect").first().click();
  await context.setOffline(true);
  await page.getByLabel("Tên phòng").fill("Phòng khách offline");
  await expect(page.getByText("Ngoại tuyến", { exact: true })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("Đã đồng bộ", { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "5 Kiểm tra" }).click();
  await page.getByRole("button", { name: /Hoàn tất thiết kế/ }).click();
  await page.getByRole("button", { name: "5 min", exact: true }).click();
  await page.getByRole("button", { name: /Lưu kịch bản/ }).click();
  await expect(page.getByText("Đã lưu kịch bản")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Chỉnh sửa thiết kế" }).click();
  await page.getByRole("button", { name: "5 Kiểm tra" }).click();
  await page.getByRole("button", { name: /Hoàn tất thiết kế/ }).click();
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await page.getByRole("button", { name: /Lưu kịch bản/ }).click();
  await page.getByRole("button", { name: "So sánh kịch bản" }).click();
  await expect(page.locator(".comparison-card")).toHaveCount(2);

  await page.goto(`/projects/${projectId}/versions`);
  await page.getByRole("button", { name: "Tạo checkpoint" }).click();
  await expect(page.locator(".version-list article")).not.toHaveCount(0);

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`/projects/${projectId}/reports`);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/shares") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Tạo & sao chép link" }).click();
  const share = await (await responsePromise).json() as { token: string };
  const shared = await context.newPage();
  await shared.goto(`/shared/${share.token}`);
  await expect(shared.getByText("READ-ONLY SHARE", { exact: false })).toBeVisible();
  await expect(shared.getByRole("button", { name: "Chỉnh sửa thiết kế" })).toHaveCount(0);
  await shared.close();
});
