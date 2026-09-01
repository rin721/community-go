import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('展开侧栏用同一递归能力呈现 Admin Reference 与 UI Elements', async ({ page }) => {
  await page.goto('/admin-reference/create-edit');
  const navigation = page.getByRole('navigation', { name: '主导航' });
  const referenceToggle = navigation.getByRole('button', {
    name: '展开或收起Admin Reference',
  });
  const uiElementsToggle = navigation.getByRole('button', {
    name: '展开或收起UI Elements',
  });

  await expect(referenceToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: '创建与编辑' })).toBeVisible();
  await expect(navigation).toHaveScreenshot('admin-shell-parent-navigation.png');
  const accessibilityScan = await new AxeBuilder({ page }).include('nav').analyze();
  expect(accessibilityScan.violations).toEqual([]);
  const currentUrl = page.url();

  await referenceToggle.click();
  await expect(referenceToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation.getByRole('link', { name: '创建与编辑' })).toBeHidden();
  await expect(page).toHaveURL(currentUrl);

  await referenceToggle.click();
  await expect(referenceToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page).toHaveURL(currentUrl);

  await expect(uiElementsToggle).toHaveAttribute('aria-expanded', 'false');
  await uiElementsToggle.click();
  await expect(uiElementsToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: '浮层与弹出界面' })).toBeVisible();
  await expect(page).toHaveURL(currentUrl);

  await uiElementsToggle.click();
  await expect(uiElementsToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveURL(currentUrl);
});

test('收缩侧栏的 Hover Flyout 保持稳定并支持键盘进入', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '收起侧栏' }).click();
  const expandSidebar = page.getByRole('button', { name: '展开侧栏' });
  await expect(expandSidebar).toBeFocused();
  const navigation = page.getByRole('navigation', { name: '主导航' });
  const trigger = navigation.getByRole('button', { name: 'UI Elements' });
  await trigger.hover();

  const flyout = page.getByRole('dialog', { name: 'UI Elements' });
  await expect(flyout).toBeVisible();
  await page.waitForTimeout(500);
  await expect(flyout).toHaveCount(1);
  await expect(flyout).toBeVisible();
  await expect(expandSidebar).toBeFocused();
  await expect(page).toHaveScreenshot('admin-shell-compact-flyout.png');

  await flyout.hover();
  await page.waitForTimeout(300);
  await expect(flyout).toBeVisible();

  await flyout.getByRole('link', { name: '浮层与弹出界面' }).click();
  await expect(page).toHaveURL(/\/ui-elements\/overlays$/);
  await expect(flyout).toBeHidden();

  await page.mouse.move(600, 240);
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(flyout).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(flyout).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('收缩侧栏切换兄弟菜单时同一时刻只有一个 Flyout 且旧菜单不残留', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '收起侧栏' }).click();
  const navigation = page.getByRole('navigation', { name: '主导航' });

  const uiElementsTrigger = navigation.getByRole('button', { name: 'UI Elements' });
  const adminPatternsTrigger = navigation.getByRole('button', { name: 'Admin Patterns' });
  const adminReferenceTrigger = navigation.getByRole('button', { name: 'Admin Reference' });

  const dialogs = page.getByRole('dialog');
  await expect(dialogs).toHaveCount(0);

  // 依次 Hover 三个兄弟父级：每一步都只能有一个可见 Dialog
  await uiElementsTrigger.hover();
  await expect(dialogs).toHaveCount(1);
  await expect(dialogs.first()).toHaveAttribute('aria-label', 'UI Elements');

  await adminPatternsTrigger.hover();
  await expect(dialogs).toHaveCount(1);
  await expect(dialogs.first()).toHaveAttribute('aria-label', 'Admin Patterns');
  await page.waitForTimeout(400);
  await expect(dialogs).toHaveCount(1);
  await expect(dialogs.first()).toHaveAttribute('aria-label', 'Admin Patterns');

  await adminReferenceTrigger.hover();
  await expect(dialogs).toHaveCount(1);
  await expect(dialogs.first()).toHaveAttribute('aria-label', 'Admin Reference');
  await page.waitForTimeout(400);
  await expect(dialogs).toHaveCount(1);
  await expect(dialogs.first()).toHaveAttribute('aria-label', 'Admin Reference');
  await expect(page).toHaveScreenshot('admin-shell-compact-sibling-swap.png');

  // 快速来回切换：旧 Flyout 的延迟关闭计时器不能误关新菜单
  await uiElementsTrigger.hover();
  await expect(dialogs).toHaveCount(1);
  await expect(dialogs.first()).toHaveAttribute('aria-label', 'UI Elements');
  await adminReferenceTrigger.hover();
  await page.waitForTimeout(400);
  await expect(dialogs).toHaveCount(1);
  await expect(dialogs.first()).toHaveAttribute('aria-label', 'Admin Reference');

  // 键盘仍可打开当前父级，Escape 关闭并恢复焦点
  await page.mouse.move(600, 240);
  await adminReferenceTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(dialogs).toHaveCount(1);
  await expect(dialogs.first()).toHaveAttribute('aria-label', 'Admin Reference');
  await page.keyboard.press('Escape');
  await expect(dialogs).toHaveCount(0);
  await expect(adminReferenceTrigger).toBeFocused();
});

test('移动侧栏使用同一树并在选择叶子后关闭', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '打开导航' }).click();
  const navigation = page.getByRole('navigation', { name: '主导航' });
  const uiElementsToggle = navigation.getByRole('button', {
    name: '展开或收起UI Elements',
  });
  await uiElementsToggle.click();
  await navigation.getByRole('link', { name: '反馈', exact: true }).click();

  await expect(page).toHaveURL(/\/ui-elements\/feedback$/);
  await expect(navigation).toBeHidden();
});

test('UI Elements 根路径进入默认子级且旧 Showcase 不再匹配', async ({ page }) => {
  await page.goto('/ui-elements');
  await expect(page).toHaveURL(/\/ui-elements\/actions-selection$/);

  await page.goto('/showcase');
  await expect(page.getByText('404 Not Found')).toBeVisible();
});
