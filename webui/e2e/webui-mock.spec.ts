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
  // 行操作菜单（详情）——主操作内联点击后打开 User 详情 Drawer（082 REQ-013；083 折叠菜单）。
  await page.locator(".data-table-row-menu .data-table-row-primary").first().click();
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

// 083 VER-083：视觉验证截图（供 codex 多模态核对设计基线）。
// 生成关键页面整页截图到 test-results/083-visual-*,由外部多模态 agent 对照
// admin-design-baseline.md 检查视觉一致性（布局/密度/语义组件/状态）。
test("083 visual snapshots for design baseline review", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const targets = [
    { path: "/dashboard", name: "dashboard" },
    { path: "/admin/accounts", name: "accounts" },
    { path: "/admin/roles", name: "roles" },
    { path: "/settings/profile", name: "settings" },
    { path: "/admin/audit", name: "audit" },
  ];
  for (const target of targets) {
    await page.goto(target.path);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `test-results/083-visual-${target.name}.png`, fullPage: true });
  }
  // 083 视觉基线：内容卡片圆角 ≤12px（styles.css 覆盖；排除 Alert/抽屉/Modal 等非内容卡片）。
  await page.goto("/dashboard");
  await page.waitForSelector(".page-section");
  await page.waitForTimeout(500);
  const oversized = await page.evaluate(() => {
    const radiusOf = (el: Element) => parseFloat(getComputedStyle(el).borderRadius) || 0;
    return Array.from(document.querySelectorAll(".page-section .card, .page-section > .surface")).filter((el) => radiusOf(el) > 12).map((el) => `${el.className.slice(0, 40)}=>${getComputedStyle(el).borderRadius}`);
  });
  expect(oversized).toEqual([]);
  // 083 视觉基线：Settings 配置区须充满内容列（margin-inline:auto 曾把 module-page 收缩到 229px）。
  await page.goto("/settings/profile");
  await page.waitForSelector(".settings-inner");
  await page.waitForTimeout(500);
  const settingsWidth = await page.evaluate(() => {
    const content = document.querySelector(".settings-content");
    const page = document.querySelector(".settings-content .module-page");
    const form = document.querySelector(".settings-content .form-panel");
    if (!content || !page || !form) return { ok: false, reason: "missing" };
    return { ok: Math.abs(page.getBoundingClientRect().width - content.getBoundingClientRect().width) < 4 && form.getBoundingClientRect().width > 400, pageW: Math.round(page.getBoundingClientRect().width), formW: Math.round(form.getBoundingClientRect().width) };
  });
  expect(settingsWidth.ok, JSON.stringify(settingsWidth)).toBe(true);
  testInfo.attach("083-visual-snapshots", { path: "test-results/083-visual-dashboard.png" });
});

// 084：组织三页/菜单页/权限页/OpenAPI 的重构工作台在 mock 下可浏览且无已知
// 缺陷（无原始 i18n key、权限描述非缺失占位、OpenAPI 首访默认打开第一个接口）。
test("084 redesigned workspaces render without known P0/P1 defects", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Departments：master-detail 工作台（搜索树 + InspectorPanel 详情区），创建入口在页头。
  await page.goto("/admin/departments");
  await expect(page.locator(".split-workspace")).toBeVisible();
  await expect(page.locator(".tree-view")).toBeVisible();
  await expect(page.locator(".inspector-panel")).toBeVisible();
  await expect(page.locator(".split-workspace > .split-workspace-pane")).toHaveCount(2);
  await page.locator(".tree-node-label").first().click();
  await expect(page.locator(".inspector-field").first()).toBeVisible();

  // Positions：名录表格 + 行菜单折叠。
  await page.goto("/admin/positions");
  await expect(page.locator(".data-table")).toBeVisible();
  await expect(page.locator(".data-table-row-menu").first()).toBeVisible();

  // Menus：树与详情不再显示原始 i18n key。
  await page.goto("/admin/menus");
  await expect(page.locator(".tree-view")).toBeVisible();
  await expect(page.locator(".tree-view")).not.toContainText("webui.");
  await expect(page.locator(".inspector-field").first()).toBeVisible();

  // Permissions：权限目录描述不再显示缺失占位文案。
  await page.goto("/admin/permissions");
  await expect(page.locator(".permission-group").first()).toBeVisible();
  await expect(page.locator(".permission-group").first().locator("td").nth(1)).not.toBeEmpty();
  await expect(page.locator(".permission-group").first().locator("td").nth(1)).not.toContainText("翻译资源缺失");

  // OpenAPI：首访自动打开第一个接口（工作台不再是空白面板）。
  await page.goto("/openapi");
  await expect(page.locator('[data-testid="openapi-workspace"]')).toBeVisible();
  await expect(page.getByText(/Execution is unavailable in mock demo builds/)).toBeVisible();
  await page.screenshot({ path: "test-results/084-workspaces-mock.png", fullPage: true });
});

// 084b：认证/初始化页产品化（居中、分组、密码显隐、确认字段）与账号角色筛选。
test("084b auth screens and account role filter render", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Login：居中 auth 面板 + 密码显隐切换（切换后 input type 变化）。
  await page.goto("/login");
  await expect(page.locator(".auth-panel")).toBeVisible();
  const passwordInput = page.locator(".auth-panel input[type='password']");
  await expect(passwordInput).toBeVisible();
  await page.locator(".auth-toggle").click();
  await expect(page.locator(".auth-password-wrap input[type='text']")).toBeVisible();

  // Setup：凭证与所有者账号两组分区 + 密码确认字段（token/密码/确认 3 个 password 输入）。
  await page.goto("/setup");
  await expect(page.locator(".auth-section")).toHaveCount(2);
  await expect(page.locator(".auth-panel input[type='password']")).toHaveCount(3);

  // Accounts：FilterBar 集成了搜索/状态/归档/角色/排序等字段（原生 select ≥3，
// 避免应用壳层首帧计数抖动）。
  await page.goto("/admin/accounts");
  await expect(page.locator(".data-table").first()).toBeVisible();
  await page.waitForTimeout(600);
  const accountSelectCount = await page.locator(".filter-bar select").count();
  expect(accountSelectCount).toBeGreaterThanOrEqual(3);
});

// 084c：账号批量操作流程（勾选 → 常驻批量条 → 归档确认 → 结果反馈）。
test("084c account bulk archive flow renders feedback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/admin/accounts");
  await expect(page.locator(".data-table").first()).toBeVisible();
  const rowCheckboxes = page.locator(".data-table tbody input[type='checkbox']");
  await rowCheckboxes.nth(0).check();
  await rowCheckboxes.nth(1).check();
  await expect(page.locator(".bulk-action-bar")).toBeVisible();
  // 批量条存在：清除 + 附加动作（归档）+ 主动作（禁用/启用）。
  expect(await page.locator(".bulk-action-bar button").count()).toBeGreaterThanOrEqual(3);
  // 触发归档确认弹窗并确认。
  await page.locator(".bulk-action-bar button").nth(1).click();
  await expect(page.locator(".rac-modal-panel").last()).toBeVisible();
  await page.locator(".rac-modal-panel .ui-button-danger").first().click();
  // 批量结果反馈（mock 返回 processed=2）。
  await expect(page.locator("[role='status']").last()).toContainText("2");
});

// 085 Workspace Tabs（mock 环境使用生成 manifest，openapi.workspace 为 singleton）：
// 打开 openapi 生成一个 host 标签；往返普通路由标签保留；reload 后低敏元数据可恢复；
// 关闭后回到默认路由。视觉证据同帧截图。
test("085 workspace tab bar: singleton open/restore/close flow in mock mode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // 宿主标签栏按可访问名称定位（面板内模块级 Tabs 也可能带 tablist 语义）。
  const hostTabs = page.locator('[role="tablist"][aria-label="Workspace tabs"]');
  // 普通路由不生成标签。
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status", exact: true })).toBeVisible();
  await expect(hostTabs).toHaveCount(0);

  // 打开 openapi singleton → 一个 host 标签 + mounted panel（页面来自面板而非普通 Outlet）。
  await page.goto("/openapi");
  await expect(hostTabs).toHaveCount(1);
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="workspace-panel-"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "API Docs", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/085-workspace-tabs-mock.png", fullPage: true });

  // 往返普通路由：标签保留、隐藏面板仍在 DOM（mounted 状态不丢；hidden+inert 不可交互）。
  await page.goto("/dashboard");
  await expect(hostTabs).toHaveCount(1);
  await expect(page.locator('[data-testid^="workspace-panel-"][data-active="false"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="workspace-panel-"][data-active="false"]')).toHaveAttribute("inert", "");

  // reload：版本化 localStorage 恢复低敏元数据（routeID/pinned/order，无 dirty）。
  await page.reload();
  await expect(hostTabs).toHaveCount(1);
  const persisted = await page.evaluate(() => localStorage.getItem("community-go-webui-workspace"));
  expect(persisted).toContain('"routeID":"openapi.workspace"');
  expect(persisted).not.toContain('"dirty"');

  // 关闭 → 默认路由，标签栏消失。
  await page.goto("/openapi");
  await page.locator(".workspace-tab-close").first().click();
  await expect(hostTabs).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Runtime status", exact: true })).toBeVisible();
});

// 085 视觉验收（REQ-085-003/004/005）：1440×1000 / 1024×768 / 390×844 三档视口，
// light/dark 各截一张；同时断言 42px 高度、底部指示线、文本不换行与 close 显隐语义。
test("085 workspace tabs visual: 42px rail, indicator, no wrap and light/dark", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/openapi");
  await expect(page.locator('[role="tablist"][aria-label="Workspace tabs"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="workspace-panel-"]')).toHaveCount(1);

  // 42px 高度（REQ-085-003：40–44px 区间内取 42px）。
  const height = await page.locator('[role="tablist"][aria-label="Workspace tabs"]').evaluate((el) => Math.round(el.getBoundingClientRect().height));
  expect(height).toBe(42);
  // Active 底部指示线（::after 2px；outline 断言：内容非空 + 高度 2px）。
  const indicator = await page.locator('[role="tab"][aria-selected="true"]').evaluate((el) => {
    const style = getComputedStyle(el.parentElement as HTMLElement, "::after");
    return { height: style.height, content: style.content, background: style.backgroundColor };
  });
  expect(indicator.content).toBe('""');
  expect(indicator.height).toBe("2px");
  expect(indicator.background).not.toBe("rgba(0, 0, 0, 0)");
  // 文本不换行（REQ-085-003/005）。
  const noWrap = await page.locator(".workspace-tab-label").first().evaluate((el) => getComputedStyle(el).whiteSpace);
  expect(noWrap).toBe("nowrap");

  const viewports = [
    { width: 1440, height: 1000, name: "desktop" },
    { width: 1024, height: 768, name: "laptop" },
    { width: 390, height: 844, name: "mobile" },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    // mock 会话初始 light；dark 点一次 toggle，回 light 再点一次。
    await page.getByRole("button", { name: "Toggle theme mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "dark");
    await page.screenshot({ path: `test-results/085-workspace-tabs-${viewport.name}-dark.png`, fullPage: true });
    await page.getByRole("button", { name: "Toggle theme mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "light");
    await page.screenshot({ path: `test-results/085-workspace-tabs-${viewport.name}-light.png`, fullPage: true });
  }
});
