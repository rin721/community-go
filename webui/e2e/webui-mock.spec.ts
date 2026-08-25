import { expect, test } from "@playwright/test";

// 075 模块：mock 演示构建下按层级浏览（分类 → 接口 → 文档/调试 → 模型）可用、
// 执行明确禁用（R075-007）。
test("075 openapi browses the hierarchy in mock mode with execution disabled", async ({ page }) => {
  await page.goto("/openapi");
  await expect(page.getByRole("heading", { name: "API Docs", exact: true })).toBeVisible();
  // 层级第一级：总览分类卡片。
  const categoryCard = page.locator('[data-testid="openapi-category-card"]').filter({ hasText: "IAM" });
  await expect(categoryCard).toBeVisible();
  // 层级第二级：分类接口列表（?tag=IAM），Debug 进入接口页但执行禁用。
  await categoryCard.click();
  await expect(page).toHaveURL(/\/openapi\/tags\?tag=IAM/);
  const sessionRow = page.locator("tr").filter({ hasText: "iam.session.read" });
  await sessionRow.getByRole("button", { name: "Debug", exact: true }).click();
  await expect(page).toHaveURL(/\/openapi\/operation\?op=/);
  await expect(page.getByText(/Execution is unavailable in mock demo builds/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toHaveCount(0);
  // 文档模式可浏览。
  await page.locator('[data-testid="openapi-mode-docs"]').click();
  await expect(page.getByRole("heading", { name: "Responses", exact: true })).toBeVisible();
  // 模型可浏览（?model= 直达）。
  await page.goto("/openapi/models?model=AccountResponse");
  await expect(page.locator('[data-testid="openapi-model-pane"]')).toBeVisible();
  await page.screenshot({ path: "test-results/075-hierarchy-mock.png", fullPage: true });
});

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

  // 062 分区注入点：顶栏快捷入口与底部 Management 数据源状态在 mock 环境可用。
  await expect(page.getByRole("button", { name: "Capabilities" })).toBeVisible();
  await expect(page.getByText("Mock data source")).toBeVisible();
  // 062 视觉证据：骨架分区注入点（顶栏快捷入口 / 底部状态项）桌面视口截图。
  await page.screenshot({ path: "test-results/zone-injection-mock.png", fullPage: true });

  // 双语：切换语言后徽标使用中文文案（语言下拉按宿主壳设计隐藏可见性，用 force 交互）。
  await page.locator("select[aria-label='Language']").selectOption("zh-CN", { force: true });
  await expect(page.locator(".mock-badge")).toHaveText("模拟环境");
});