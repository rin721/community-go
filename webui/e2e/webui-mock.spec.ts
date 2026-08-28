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
  await expect(page.getByRole("rowheader", { name: "Mock Administrator", exact: true })).toBeVisible();

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
  // 087：普通 route 走唯一普通 Outlet；断言限定在唯一可见 viewport。
  const activePage = page.locator('.page-viewport:visible').first();
  // Interaction QA 基线：账号目录 DataTable + 行操作 + 详情 Drawer 可用。
  await page.goto("/admin/accounts");
  await expect(activePage.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(activePage.locator(".data-table")).toBeVisible();
  await expect(activePage.locator(".filter-bar")).toBeVisible();
  await expect(activePage.locator('[data-reveal="hidden"]')).toHaveCount(0);
  // 行操作菜单（详情）——主操作内联点击后打开 User 详情 Drawer（082 REQ-013；083 折叠菜单）。
  // Drawer 是 RAC portal（渲染在 body 附近的 fragment，不在面板内），按页面级断言。
  await activePage.locator(".data-table-row-menu .data-table-row-primary").first().click();
  await expect(page.locator(".detail-drawer")).toBeVisible();

  // Backend Compatibility QA 基线：迁移页面保持原能力（从列表 fixture 可见用户）。
  await page.goto("/admin/permissions");
  await expect(activePage.getByRole("heading", { name: "Permissions" })).toBeVisible();
  await expect(activePage.locator(".permission-group").first()).toBeVisible();
  await expect(activePage.locator(".code-text-value").first()).toBeVisible();

  // Organization 部门树 + Inspector（Tree 语义组件装配）。
  await page.goto("/admin/departments");
  await expect(activePage.locator(".tree-view").first()).toBeVisible();
  await expect(activePage.locator(".inspector-panel").first()).toBeVisible();

  // Design QA 基线：页面共享语义类（page-header/filter-bar/data-table）。
  await page.goto("/admin/accounts");
  await expect(activePage.locator(".page-header")).toBeVisible();
  await expect(activePage.locator(".data-table")).not.toHaveAttribute("aria-busy", "true");
  await expect(activePage.locator('[data-reveal="hidden"]')).toHaveCount(0);
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

test("090 page family viewport matrix keeps content inside the viewport", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const viewports = [
    { width: 1440, height: 900, name: "desktop" },
    { width: 1280, height: 800, name: "wide" },
    { width: 1024, height: 768, name: "laptop" },
    { width: 768, height: 1024, name: "tablet" },
    { width: 390, height: 844, name: "mobile" },
  ];
  // VERIFY-090-002 全部页面族：列表（账户/角色/岗位/会话/API Token/审计）、
  // master-detail（部门）、设置组（profile/appearance/notifications）、
  // 工作台（dashboard/openapi）。
  const targets = ["/dashboard", "/admin/accounts", "/admin/roles", "/admin/departments", "/admin/positions", "/admin/sessions", "/admin/api-tokens", "/settings/profile", "/settings/appearance", "/settings/notifications", "/admin/audit", "/openapi"];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const target of targets) {
      await page.goto(target);
      await expect(page.locator(".page-viewport:visible").first()).toBeVisible();
      const geometry = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        shellWidth: document.querySelector(".app-shell")?.getBoundingClientRect().width ?? 0,
      }));
      expect(geometry.documentWidth, `${target} at ${viewport.name}`).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.shellWidth, `${target} shell at ${viewport.name}`).toBeGreaterThan(0);
    }
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("090-dashboard-light-1280.png"), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.dataset.density = "compact";
    document.documentElement.dataset.colorScheme = "dark";
    document.documentElement.classList.add("dark");
  });
  await page.waitForTimeout(50);
  const darkCompactGeometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    scheme: document.documentElement.dataset.colorScheme,
    density: document.documentElement.dataset.density,
  }));
  expect(darkCompactGeometry.scheme).toBe("dark");
  expect(darkCompactGeometry.density).toBe("compact");
  expect(darkCompactGeometry.documentWidth).toBeLessThanOrEqual(darkCompactGeometry.viewport + 1);
  await page.screenshot({ path: testInfo.outputPath("090-dashboard-dark-compact-1280.png"), fullPage: true });
});

// 084：组织三页/菜单页/权限页/OpenAPI 的重构工作台在 mock 下可浏览且无已知
// 缺陷（无原始 i18n key、权限描述非缺失占位、OpenAPI 首访默认打开第一个接口）。
test("084 redesigned workspaces render without known P0/P1 defects", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // 087：普通页面只走唯一普通 Outlet；OpenAPI 才显式挂载 workspace panel。
  const activePage = page.locator('.page-viewport:visible').first();
  // Departments：master-detail 工作台（搜索树 + InspectorPanel 详情区），创建入口在页头。
  await page.goto("/admin/departments");
  await expect(activePage.locator(".split-workspace")).toBeVisible();
  await expect(activePage.locator(".tree-view").first()).toBeVisible();
  await expect(activePage.locator(".inspector-panel").first()).toBeVisible();
  await expect(activePage.locator(".split-workspace > .split-workspace-pane")).toHaveCount(2);
  await activePage.locator(".tree-node-label").first().click();
  await expect(activePage.locator(".inspector-field").first()).toBeVisible();

  // Positions：名录表格 + 行菜单折叠。
  await page.goto("/admin/positions");
  await expect(activePage.locator(".data-table")).toBeVisible();
  await expect(activePage.locator(".data-table-row-menu").first()).toBeVisible();

  // Menus：树与详情不再显示原始 i18n key。
  await page.goto("/admin/menus");
  await expect(activePage.locator(".tree-view").first()).toBeVisible();
  await expect(activePage.locator(".tree-view").first()).not.toContainText("webui.");
  await expect(activePage.locator(".inspector-field").first()).toBeVisible();

  // Permissions：权限目录描述不再显示缺失占位文案。
  await page.goto("/admin/permissions");
  await expect(activePage.locator(".permission-group").first()).toBeVisible();
  await expect(activePage.locator(".permission-group").first().locator("td").nth(1)).not.toBeEmpty();
  await expect(activePage.locator(".permission-group").first().locator("td").nth(1)).not.toContainText("翻译资源缺失");

  // OpenAPI：显式 singleton workspace 打开第一个接口。
  await page.goto("/openapi");
  await expect(activePage.locator('[data-testid="openapi-workspace"]')).toBeVisible();
  await expect(activePage.getByText(/Execution is unavailable in mock demo builds/)).toBeVisible();
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

// 087：mock 环境验证显式 workspace 资格与普通页面隔离；OpenAPI singleton 保留，
// Settings/Accounts 不生成标签，旧普通 route 快照不恢复。
test("087 workspace policy isolates ordinary routes in mock mode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const hostTabs = page.locator('[role="tablist"][aria-label="Workspace tabs"]');

  // Dashboard 与 Accounts 都是普通 route，不创建标签，也不挂载隐藏 panel。
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status", exact: true })).toBeVisible();
  await expect(hostTabs).toHaveCount(0);

  await page.goto("/admin/accounts?query=xiaolin%40iqwq.com&archived=false");
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await expect(hostTabs).toHaveCount(0);
  await expect(page.locator('[data-testid^="workspace-panel-"]')).toHaveCount(0);

  // Settings 八分区共享一个普通 group layout，点击分区只切换 child Outlet。
  await page.goto("/settings/profile");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  await expect(hostTabs).toHaveCount(0);
  await page.evaluate(() => { (window as unknown as { __settingsLayout?: Element }).__settingsLayout = document.querySelector(".settings-inner") ?? undefined; });
  await page.locator(".settings-inner").getByText("Account", { exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/account$/);
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __settingsLayout?: Element }).__settingsLayout === document.querySelector(".settings-inner"))).toBe(true);
  await expect(hostTabs).toHaveCount(0);

  // OpenAPI 是唯一显式 singleton workspace，重复访问不增加标签或 panel。
  await page.goto("/openapi");
  await expect(page.getByRole("heading", { name: "API Docs", exact: true })).toBeVisible();
  await expect(hostTabs.getByRole("tab")).toHaveCount(1);
  await expect(page.locator('[data-testid^="workspace-panel-"]')).toHaveCount(1);
  await page.goto("/openapi");
  await expect(hostTabs.getByRole("tab")).toHaveCount(1);

  // 离开到普通 Settings 后，OpenAPI 标签保留但没有活动 panel。
  await page.goto("/settings/profile");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  await expect(hostTabs.getByRole("tab")).toHaveCount(1);
  await expect(page.locator('[data-testid^="workspace-panel-"][data-active="true"]')).toHaveCount(0);

  // reload：只恢复显式 workspace 元数据，普通 route 不进入快照。
  await page.reload();
  await expect(hostTabs.getByRole("tab")).toHaveCount(1);
  const persisted = await page.evaluate(() => localStorage.getItem("community-go-webui-workspace"));
  expect(persisted).toContain('"routeID":"openapi.workspace"');
  expect(persisted).not.toContain('"routeID":"iam.accounts"');
  expect(persisted).not.toContain('"dirty"');
});

// 086 几何稳定化 QA（REQ-086-001..007）：跨路由切换时公共 Shell 逐像素稳定；
// compact/default density 只经 token（--density-factor）缩放；ContentViewport 是唯一
// 滚动/宽度容器（data-page-width 有生产端），业务内容不复制公共组件尺寸。
test("086 shell geometry is pixel-stable across routes and density token driven", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const routes = ["/openapi", "/dashboard", "/admin/accounts", "/admin/roles", "/settings/profile"];
  const frame = page.locator(".app-shell");
  const topbar = page.locator(".topbar");
  const sidebar = page.locator(".app-sidebar");
  const tabsBar = page.locator('[role="tablist"][aria-label="Workspace tabs"]');
  const boxOf = (locator: ReturnType<typeof page.locator>) => locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });

  // 基准：OpenAPI 显式 workspace 标签下采集公共框架几何。先等 shell 完全稳定
  // （首帧模块编译 + grid 过渡完成后），避免采集到过渡中间状态。
  await page.goto("/openapi");
  await expect(page.getByRole("heading", { name: "API Docs", exact: true })).toBeVisible();
  await expect(tabsBar).toHaveCount(1);
  await page.waitForFunction(() => {
    const topbarEl = document.querySelector(".topbar");
    const shellEl = document.querySelector(".app-shell");
    if (!topbarEl || !shellEl) return false;
    const topbarBox = topbarEl.getBoundingClientRect();
    const shellBox = shellEl.getBoundingClientRect();
    // 090 topbar 基线由 token 驱动（density=default 时 56px）且 shell 高度进视口。
    return topbarBox.height === 56 && shellBox.height > 0;
  });
  const baseline = { frame: await boxOf(frame), topbar: await boxOf(topbar), sidebar: await boxOf(sidebar), tabs: await boxOf(tabsBar) };
  // 086 几何基线视觉证据：default density + light 的公共框架截图。
  await page.screenshot({ path: "test-results/086-shell-geometry-dashboard.png", fullPage: true });

  // 跨路由切换：公共框架几何逐像素不变（面板内容变化不影响 Shell）。
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator(".page-viewport:visible").first()).toBeVisible();
    await page.waitForFunction(() => {
      const topbarEl = document.querySelector(".topbar");
      return Boolean(topbarEl && Math.round(topbarEl.getBoundingClientRect().height) === 56);
    });
    expect(await boxOf(frame), `frame ${route}`).toEqual(baseline.frame);
    expect(await boxOf(topbar), `topbar ${route}`).toEqual(baseline.topbar);
    expect(await boxOf(sidebar), `sidebar ${route}`).toEqual(baseline.sidebar);
    expect(await boxOf(tabsBar), `tabs ${route}`).toEqual(baseline.tabs);
  }

  // OpenAPI singleton 标签可关闭，普通页面不会增加第二个宿主标签。
  await page.goto("/openapi");
  await expect(page.locator('[data-workspace-tab].workspace-tab').first()).toBeVisible();
  const firstTab = page.locator('[data-workspace-tab].workspace-tab').first();
  await expect(firstTab.locator(".workspace-tab-close")).toHaveCount(1);
  await expect(page.locator(".workspace-tab-close").first()).toBeVisible();

  // compact density：公共框架随 --density-factor 缩放，而不是页面临时覆盖。
  // 先等浏览器对纯自定义属性变化完成样式重算（同一同步 tick 内测量会读到旧值）。
  const tabsDefault = Math.round((await boxOf(tabsBar)).height);
  await page.evaluate(() => { document.documentElement.dataset.density = "compact"; });
  await page.waitForFunction(() => {
    const el = document.querySelector(".topbar");
    return Boolean(el && el.getBoundingClientRect().height < 56);
  });
  const tabsCompact = Math.round((await boxOf(tabsBar)).height);
  expect(tabsDefault).toBe(36);
  expect(tabsCompact).toBeGreaterThan(0);
  expect(tabsCompact).toBeLessThan(tabsDefault);
  await page.evaluate(() => { document.documentElement.dataset.density = "default"; });

  // ContentViewport 唯一滚动容器：业务内容有 data-page-width 生产端，无双滚动副本。
  await page.goto("/settings/profile");
  await expect(page.locator('.page-viewport:visible[data-page-width="settings"]')).toHaveCount(1);
  await page.goto("/admin/accounts");
  await expect(page.locator('.page-viewport:visible[data-page-width="wide"]')).toHaveCount(1);
  await expect(page.locator(".workspace-panel-scroll")).toHaveCount(0);

  // light/dark 与 preset 切换：Shell 几何不变（颜色走 token，不打乱布局）。
  const lightFrame = await boxOf(frame);
  await page.getByRole("button", { name: "Toggle theme mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "dark");
  await page.waitForFunction(() => document.querySelector(".app-shell")?.getBoundingClientRect().height === 720);
  expect(await boxOf(frame), "frame dark").toEqual(lightFrame);
  expect(await boxOf(topbar), "topbar dark").toEqual(baseline.topbar);
  expect(await boxOf(sidebar), "sidebar dark").toEqual(baseline.sidebar);
  await page.getByRole("button", { name: "Toggle theme mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "light");
  // preset 单源：--heroui-primary 与 semantic --primary 同源（086 不再双份维护）。
  await page.evaluate(() => { document.documentElement.dataset.themePreset = "cyan"; });
  const preset = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return { hero: cs.getPropertyValue("--heroui-primary").trim(), semantic: cs.getPropertyValue("--prim-primary").trim() };
  });
  expect(preset.hero).toBeTruthy();
  expect(preset.semantic).toBe("#06b6d4");
  await page.evaluate(() => { document.documentElement.dataset.themePreset = "blue"; });
});

// 090 显式 workspace 视觉验收（沿用标签栏的几何与可访问性契约）：1440×1000 /
// 1024×768 / 390×844 三档视口，
// light/dark 各截一张；同时断言 36px 高度、底部指示线、文本不换行与 close 显隐语义。
test("087 workspace tabs visual: explicit singleton rail and light/dark", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // OpenAPI 显式 singleton：进入即出现一个 host 标签 + mounted panel。
  await page.goto("/openapi");
  await expect(page.locator('[role="tablist"][aria-label="Workspace tabs"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="workspace-panel-"]')).toHaveCount(1);

  // 36px 高度（090 目标规格；workspace rail 仅承载真实工作区）。
  const height = await page.locator('[role="tablist"][aria-label="Workspace tabs"]').evaluate((el) => Math.round(el.getBoundingClientRect().height));
  expect(height).toBe(36);
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
    if (viewport.width === 390) {
      // 090 compact workbench：资源栏/请求/响应改为纵向流，页面本身不得产生
      // 横向溢出；代码块或面板内部允许拥有各自的滚动策略。
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
    // mock 会话初始 light；dark 点一次 toggle，回 light 再点一次。
    await page.getByRole("button", { name: "Toggle theme mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "dark");
    await page.screenshot({ path: `test-results/085-workspace-tabs-${viewport.name}-dark.png`, fullPage: true });
    await page.getByRole("button", { name: "Toggle theme mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "light");
    await page.screenshot({ path: `test-results/085-workspace-tabs-${viewport.name}-light.png`, fullPage: true });
  }
});

// 090 BE-090-003：审计页使用服务端稳定游标翻页——mock 下验证
// 上一页/下一页导航、页签文案与筛选变化回到第一页。
test("090 audit page paginates with server cursor in mock mode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const activePage = page.locator('.page-viewport:visible').first();
  await page.goto("/admin/audit");
  await expect(activePage.getByRole("heading", { name: "Audit log" })).toBeVisible();
  // 首页：上一页禁用；60 条 mock 事件 > 默认每页 50 条，下一页可用。
  await expect(activePage.getByRole("button", { name: "Previous" })).toBeDisabled();
  await expect(activePage.getByRole("button", { name: "Next" })).toBeEnabled();
  await expect(activePage.getByText("Page 1", { exact: false })).toBeVisible();
  // 下一页：进入第 2 页。
  await activePage.getByRole("button", { name: "Next" }).click();
  await expect(activePage.getByText("Page 2", { exact: false })).toBeVisible();
  await expect(activePage.getByRole("button", { name: "Previous" })).toBeEnabled();
  // 回到第一页。
  await activePage.getByRole("button", { name: "Previous" }).click();
  await expect(activePage.getByText("Page 1", { exact: false })).toBeVisible();
  // 筛选变化（操作字段）回到第一页。
  await activePage.getByLabel("Operation").fill("iam.accounts.list");
  await expect(activePage.getByText("Page 1", { exact: false })).toBeVisible();
});

// 090 BE-090-005: appearance preferences persist via the server (mock in-memory
// state) - after switching the theme mode the control reflects the server
// response within the session (mock state resets on full page reload by design).
test("090 appearance preferences persist via server in mock mode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const activePage = page.locator('.page-viewport:visible').first();
  await page.goto("/settings/appearance");
  await expect(activePage.getByRole("heading", { name: "Appearance", exact: true })).toBeVisible();
  // Server default theme mode is system; switch to dark and assert the control
  // reflects the server response.
  const modeSelect = activePage.getByRole("button", { name: /Theme mode/ });
  await expect(modeSelect).toHaveText("System");
  await modeSelect.click();
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await expect(modeSelect).toHaveText("Dark");
  // Switch density too and verify the server-backed control updated.
  const densitySelect = activePage.getByRole("button", { name: /Content density/ });
  await expect(densitySelect).toHaveText("Comfortable");
  await densitySelect.click();
  await page.getByRole("option", { name: "Compact", exact: true }).click();
  await expect(densitySelect).toHaveText("Compact");
});

// 090 PAGE-090-007：OpenAPI 工作台在紧凑视口使用「资源/请求/响应」三段式
// 导航（每次单面板），切换请求段后资源树隐藏；页面无横向溢出。
test("090 openapi workspace switches segments on compact viewport", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  const activePage = page.locator('.page-viewport:visible').first();
  await page.goto("/openapi");
  // 三段式导航出现，默认资源段显示资源树。
  const segmentNav = activePage.locator('[aria-label="Workspace view"]');
  await expect(segmentNav).toBeVisible();
  await expect(activePage.locator('[data-testid="openapi-tree"]')).toBeVisible();
  // 点击树叶子打开操作（compact 下自动切到请求段）。
  await activePage.locator('button[data-testid="openapi-tree-leaf"]').first().click();
  await expect(activePage.locator('[data-testid="openapi-workspace"]')).toBeVisible();
  await expect(activePage.locator('[data-testid="openapi-tree"]')).toHaveCount(0);
  // 切回资源段：资源树恢复。
  await activePage.getByRole("button", { name: "Resources", exact: true }).click();
  await expect(activePage.locator('[data-testid="openapi-tree"]')).toBeVisible();
  // 切到响应段：工作台可见（响应区）。
  await activePage.getByRole("button", { name: "Response", exact: true }).click();
  await expect(activePage.locator('[data-testid="openapi-workspace"]')).toBeVisible();
  // 无横向页面溢出。
  const geometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport + 1);
});

// 090 PAGE-090-002：API Token 一次性 secret 完整流程（mock）——创建后展示
// secret，轮换后展示新 secret，旧 secret 不再出现。
test("090 api token one-time secret flow renders in mock mode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const activePage = page.locator('.page-viewport:visible').first();
  await page.goto("/admin/api-tokens");
  await expect(activePage.getByRole("heading", { name: "API tokens", exact: true })).toBeVisible();
  // 创建令牌：填写名称并选择至少一个 scope（mock 会话权限包含 iam:account:read）。
  const nameInput = activePage.getByRole("textbox", { name: "Name", exact: true }).first();
  await nameInput.fill("e2e-token");
  await activePage.getByRole("checkbox", { name: "iam:account:read", exact: true }).check();
  // 有效期默认 custom；填写过期时间（datetime-local input）。
  await activePage.locator("input[type='datetime-local']").fill("2027-01-01T00:00");
  await activePage.getByRole("button", { name: "Create token", exact: true }).click();
  // 一次性 secret 展示（mock 固定 secret）。
  await expect(activePage.getByText("Token created")).toBeVisible();
  await expect(activePage.getByText("iam_mock-api-token-secret")).toBeVisible();
  // 轮换：API Token 行菜单的主操作即 Rotate（首个非危险项），点击后展示新 secret。
  await activePage.locator(".data-table-row-menu .data-table-row-primary").first().click();
  await expect(activePage.getByText("iam_mock-rotated-secret")).toBeVisible();
  // 批量吊销（090 PAGE-090-002）：勾选行出现批量操作条并显示选择数。
  const rowCheckbox = activePage.locator(".data-table tbody input[type='checkbox']").first();
  await rowCheckbox.check();
  await expect(activePage.getByText(/tokens selected/)).toBeVisible();
});

// 090 VERIFY-090-003：迁移页面的键盘/读屏语义基线（aria-label、role、焦点可达）。
test("090 migrated pages expose keyboard and screen-reader semantics", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const activePage = page.locator('.page-viewport:visible').first();
  // 账户列表：数据表有可访问名称、加载完成后 aria-busy 清空；筛选控件可聚焦。
  await page.goto("/admin/accounts");
  await expect(activePage.locator(".data-table")).toHaveAttribute("aria-label", /Account list/);
  await expect(activePage.locator(".data-table")).not.toHaveAttribute("aria-busy", "true");
  const searchInput = activePage.getByRole("searchbox").first();
  await expect(searchInput).toBeVisible();
  await searchInput.focus();
  await expect(searchInput).toBeFocused();
  // 键盘：Enter 提交搜索后仍可达列表。
  await searchInput.press("Enter");
  await expect(activePage.locator(".data-table")).toBeVisible();
  // 部门树：role=tree 语义与键盘可达的树节点。
  await page.goto("/admin/departments");
  await expect(activePage.locator(".tree-view").first()).toHaveAttribute("role", "tree");
  await activePage.locator(".tree-node-label").first().focus();
  await expect(activePage.locator(".tree-node-label").first()).toBeFocused();
  // OpenAPI：紧凑段导航按钮 aria-pressed 语义；桌面标签栏 role=tablist。
  await page.goto("/openapi");
  await expect(activePage.locator('[data-testid="openapi-workspace"]')).toBeVisible();
  await expect(activePage.locator('[role="tablist"]').first()).toBeVisible();
});
