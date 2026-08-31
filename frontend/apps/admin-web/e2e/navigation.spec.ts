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
  await expect(uiElementsToggle).toHaveAttribute('aria-expanded', 'false');
  await uiElementsToggle.click();
  await expect(uiElementsToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: '浮层与弹出界面' })).toBeVisible();

  await navigation.getByRole('link', { name: 'UI Elements', exact: true }).click();
  await expect(page).toHaveURL(/\/ui-elements\/actions-selection$/);
  await expect(uiElementsToggle).toHaveAttribute('aria-expanded', 'true');
});

test('收缩侧栏通过可访问 Flyout 进入任意子级', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '收起侧栏' }).click();
  const navigation = page.getByRole('navigation', { name: '主导航' });
  const trigger = navigation.getByRole('button', { name: 'UI Elements' });
  await trigger.hover();

  const flyout = page.getByRole('dialog', { name: 'UI Elements' });
  await expect(flyout).toBeVisible();
  await flyout.getByRole('link', { name: '浮层与弹出界面' }).click();
  await expect(page).toHaveURL(/\/ui-elements\/overlays$/);
  await expect(flyout).toBeHidden();
  await trigger.click();
  await expect(flyout).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
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
