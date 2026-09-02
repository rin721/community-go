import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Active Path Anchored Accordion 验证（真实 Navigation Tree）。
// 断言只针对当前真实树的可见行为，不把 Admin Reference / Admin Patterns 当前
// 同组/跨组的偶然结构写成长期规范（顶层竞争由 pure/render fixture 证明）。

const nav = (page: Page) => page.getByRole('navigation', { name: '主导航' });

async function expectHydrated(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
}

async function expectToggleExpanded(page: Page, label: string, value: 'true' | 'false') {
  await expect(nav(page).getByRole('button', { name: `展开或收起${label}` })).toHaveAttribute(
    'aria-expanded',
    value,
  );
}

test('当前 Route 的 active 祖先链自动展开（深层页面）', async ({ page }) => {
  await page.goto('/admin-reference/create-edit');
  await expectHydrated(page);
  await expectToggleExpanded(page, 'Admin Reference', 'true');
  await expect(nav(page).getByRole('link', { name: '创建与编辑' })).toBeVisible();
});

test('展开非 active 顶层再展开另一非 active 顶层：旧 exploration 收起', async ({ page }) => {
  await page.goto('/');
  await expectHydrated(page);
  // 顶层 branch（root scope）：Admin Patterns / Admin Reference / UI Elements
  await expectToggleExpanded(page, 'Admin Patterns', 'false');
  await expectToggleExpanded(page, 'Admin Reference', 'false');

  await nav(page).getByRole('button', { name: '展开或收起Admin Patterns' }).click();
  await expectToggleExpanded(page, 'Admin Patterns', 'true');

  // 展开另一个顶层非 active：按 root scope 竞争，Admin Patterns 收起
  await nav(page).getByRole('button', { name: '展开或收起Admin Reference' }).click();
  await expectToggleExpanded(page, 'Admin Reference', 'true');
  await expectToggleExpanded(page, 'Admin Patterns', 'false');
});

test('路由切换后 exploration 清空、新 active 链接管且旧分支不复活', async ({ page }) => {
  // 在 /admin-reference/create-edit（Admin Reference active）手动展开 Admin Patterns 作 exploration
  await page.goto('/admin-reference/create-edit');
  await expectHydrated(page);
  await expectToggleExpanded(page, 'Admin Reference', 'true');
  await nav(page).getByRole('button', { name: '展开或收起Admin Patterns' }).click();
  await expectToggleExpanded(page, 'Admin Patterns', 'true');
  // active 链 Admin Reference 保持展开
  await expectToggleExpanded(page, 'Admin Reference', 'true');

  // 导航到另一分支的深层页：Admin Patterns 成为新 active 链，Admin Reference 收起
  await nav(page).getByRole('link', { name: '布局与导航', exact: true }).click();
  await expect(page).toHaveURL(/\/admin-patterns\/layout-navigation$/);
  await expectToggleExpanded(page, 'Admin Patterns', 'true');
  await expectToggleExpanded(page, 'Admin Reference', 'false');
  // Admin Patterns 内容可见
  await expect(nav(page).getByRole('link', { name: '集合与数据', exact: true })).toBeVisible();
});

test('刷新深层 Route 后恢复唯一正确展开路径', async ({ page }) => {
  await page.goto('/admin-patterns/layout-navigation');
  await expectHydrated(page);
  await expectToggleExpanded(page, 'Admin Patterns', 'true');
  // 手动展开另一顶层作为 exploration
  await nav(page).getByRole('button', { name: '展开或收起Admin Reference' }).click();
  await expectToggleExpanded(page, 'Admin Reference', 'true');
  await expectToggleExpanded(page, 'Admin Patterns', 'true'); // active 锚定保持

  await page.reload();
  await expectHydrated(page);
  // 刷新后 exploration 清空：只有 active 链 Admin Patterns 展开
  await expectToggleExpanded(page, 'Admin Patterns', 'true');
  await expectToggleExpanded(page, 'Admin Reference', 'false');
});

test('active ancestor 不允许被普通点击收起（点击为 no-op）', async ({ page }) => {
  await page.goto('/admin-reference/create-edit');
  await expectHydrated(page);
  await expectToggleExpanded(page, 'Admin Reference', 'true');
  // 点击 active ancestor 尝试收起：必须保持展开（不隐藏当前 Route）
  await nav(page).getByRole('button', { name: '展开或收起Admin Reference' }).click();
  await expectToggleExpanded(page, 'Admin Reference', 'true');
  await expect(nav(page).getByRole('link', { name: '创建与编辑' })).toBeVisible();
});

test('leaf 导航后同一父级下不再有历史 exploration 竞争', async ({ page }) => {
  await page.goto('/');
  await expectHydrated(page);
  // 展开 UI Elements 并导航到其叶子
  await nav(page).getByRole('button', { name: '展开或收起UI Elements' }).click();
  await expectToggleExpanded(page, 'UI Elements', 'true');
  await nav(page).getByRole('link', { name: '操作与选择', exact: true }).click();
  await expect(page).toHaveURL(/\/ui-elements\/actions-selection$/);
  // UI Elements 现在是 active 链，保持展开
  await expectToggleExpanded(page, 'UI Elements', 'true');
  // 展开另一个顶层：UI Elements（active）保持，exploration 为新顶层
  await nav(page).getByRole('button', { name: '展开或收起Admin Patterns' }).click();
  await expectToggleExpanded(page, 'Admin Patterns', 'true');
  await expectToggleExpanded(page, 'UI Elements', 'true');
});

test('Sidebar 展开的 accordion 无 Axe 违规', async ({ page }) => {
  await page.goto('/admin-reference/create-edit');
  await expectHydrated(page);
  await nav(page).getByRole('button', { name: '展开或收起Admin Patterns' }).click();
  const accessibilityScan = await new AxeBuilder({ page }).include('nav').analyze();
  expect(accessibilityScan.violations).toEqual([]);
});
