import { expect, test } from "@playwright/test";

// mock project 专用：不拦截任何路由——整个 WebUI（宿主骨架 + 全部模块数据）
// 由显式声明 VITE_WEBUI_DATA_SOURCE=mock 触发的宿主 mock 传输层提供，零后端可运行。
test("mock mode boots the whole WebUI without a backend and marks every page", async ({ page }) => {
  await page.goto("/");
  // manifest + session 来自本地 mock，默认路由跳转到运行状态页。
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  await expect(page.locator(".mock-badge")).toHaveText("Mock environment");

  // 模块页面数据来自本地 mock（IAM 账号 fixture）。
  await page.goto("/admin/accounts");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByText("Mock Administrator", { exact: true })).toBeVisible();

  // Ops 页面在 mock 下收到 fixture 数据并正常渲染。
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  await expect(page.getByText("Runtime diagnostics available")).toBeVisible();

  // 双语：切换语言后徽标使用中文文案（语言下拉按宿主壳设计隐藏可见性，用 force 交互）。
  await page.locator("select[aria-label='Language']").selectOption("zh-CN", { force: true });
  await expect(page.locator(".mock-badge")).toHaveText("模拟环境");
});