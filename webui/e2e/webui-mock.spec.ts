import { expect, test } from "@playwright/test";

// 075 模块：mock 演示构建下工作台（资源树 + 标签 + 请求/响应上下分割）可浏览、
// 执行明确禁用（R075-009）。
test("075 openapi browses the workspace in mock mode with execution disabled", async ({ page }) => {
  await page.goto("/openapi");
  await expect(page.getByRole("heading", { name: "API Docs", exact: true })).toBeVisible();
  // 左资源树可浏览。
  const tree = page.locator('[data-testid="openapi-tree"]');
  await expect(tree).toBeVisible();
  await expect(tree.getByText("IAM", { exact: true }).first()).toBeVisible();
  // 点击接口叶子 → 工作台出现，执行禁用。
  const treeLeaf = page.locator('button[data-testid="openapi-tree-leaf"]').filter({ hasText: "iam.session.read" });
  await treeLeaf.scrollIntoViewIfNeeded();
  await treeLeaf.click();
  await expect(page.locator('[data-testid="openapi-workspace"]')).toBeVisible();
  await expect(page.getByText(/Execution is unavailable in mock demo builds/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toHaveCount(0);
  // 响应区默认占位。
  await expect(page.getByText(/Send the request to see the response here/)).toBeVisible();
  await page.screenshot({ path: "test-results/075-workspace-mock.png", fullPage: true });
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

  // 062 分区注入点：顶栏快捷入口在 mock 环境可用（083 布局改：footer-status 随 Footer 移除）。
  await expect(page.getByRole("button", { name: "Capabilities" })).toBeVisible();
  // 083 LAYOUT-003：固定 Footer 已移除，工作区不再占用底部。
  await expect(page.locator(".app-footer")).toHaveCount(0);
  // 062 视觉证据：骨架分区注入点（顶栏快捷入口）桌面视口截图。
  await page.screenshot({ path: "test-results/zone-injection-mock.png", fullPage: true });

  // 双语：切换语言后徽标使用中文文案（语言下拉按宿主壳设计隐藏可见性，用 force 交互）。
  await page.locator("select[aria-label='Language']").selectOption("zh-CN", { force: true });
  await expect(page.locator(".mock-badge")).toHaveText("模拟环境");
});

// 082 REQ-082-024：三层 QA（Design/Interaction/Backend Compatibility）基线。
// 迁移后的页面在 mock 数据源下可浏览：DataTable 增强、行菜单、详情 Drawer、
// Tree、分组权限目录等语义组件正常装配（Interaction QA 的可见性层）。
test("082 migrated pages render with semantic components in mock mode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Interaction QA 基线：账号目录 DataTable + 行操作 + 详情 Drawer 可用。
  await page.goto("/admin/accounts");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.locator(".data-table")).toBeVisible();
  await expect(page.locator(".filter-bar")).toBeVisible();
  await expect(page.locator('[data-reveal="hidden"]')).toHaveCount(0);
  // 行操作菜单（详情）——点击后打开 User 详情 Drawer（082 REQ-013）。
  await page.locator(".data-table-row-actions button").first().click();
  await expect(page.locator(".detail-drawer")).toBeVisible();

  // Backend Compatibility QA 基线：迁移页面保持原能力（从列表 fixture 可见用户）。
  await page.goto("/admin/permissions");
  await expect(page.getByRole("heading", { name: "Permissions" })).toBeVisible();
  await expect(page.locator(".permission-group").first()).toBeVisible();
  await expect(page.locator(".code-text-value").first()).toBeVisible();

  // Organization 部门树 + Inspector（Tree 语义组件装配）。
  await page.goto("/admin/departments");
  await expect(page.locator(".tree-view")).toBeVisible();
  await expect(page.locator(".inspector-panel")).toBeVisible();

  // Design QA 基线：页面共享语义类（page-header/filter-bar/data-table）。
  await page.goto("/admin/accounts");
  await expect(page.locator(".page-header")).toBeVisible();
  await expect(page.locator(".data-table")).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator('[data-reveal="hidden"]')).toHaveCount(0);
  await page.screenshot({ path: "test-results/082-migrated-pages-mock.png", fullPage: true });
});
