import { expect, test } from '@playwright/test';

test('桌面与超宽屏 Reference 布局保持稳定', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reference');
  await expect(page).toHaveScreenshot('reference-desktop.png', { fullPage: true });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.reload();
  await expect(page).toHaveScreenshot('reference-ultrawide.png', { fullPage: true });
});

test('桌面 Showcase 保持基础组件权威面稳定', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/showcase');
  await expect(page.getByRole('heading', { name: 'Alert、Badge 与 Notification' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Status 与 Progress' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Card 与 Surface 层级' })).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-desktop.png', { fullPage: true });
  expect(consoleErrors).toEqual([]);
});

test('移动窗口、Dark Mode 与英文扩张保持无溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/showcase');
  await page.getByRole('button', { name: '切换主题' }).click();
  await page.getByRole('button', { name: '切换语言' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page).toHaveScreenshot('showcase-mobile-dark-en.png', { fullPage: true });
});

test('移动侧栏打开状态纳入视觉回归', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reference');
  await page.getByRole('button', { name: '打开导航' }).click();
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
  await expect(page).toHaveScreenshot('mobile-navigation-open.png', { fullPage: true });
});
