import { expect, test, type Page } from '@playwright/test';

async function expectReferenceReady(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('高密度数据工作台');
  await expect(page.getByRole('grid').getByRole('row')).toHaveCount(13);
}

test('桌面与超宽屏 Reference 布局保持稳定', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reference');
  await expectReferenceReady(page);
  await expect(page).toHaveScreenshot('reference-desktop.png', { fullPage: true });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.reload();
  await expectReferenceReady(page);
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
  await expect(page.getByRole('heading', { name: 'Data Display 与 Table' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Card 与 Surface 层级' })).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-desktop.png', { fullPage: true });
  expect(consoleErrors).toEqual([]);
});

test('Showcase 九个 UI Element Family 分区均有独立视觉基线', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/showcase');
  await expect(page.getByText('公开 Element 39 / 39')).toBeVisible();

  const families = [
    'actions',
    'feedback',
    'status-async',
    'identity-display',
    'navigation',
    'data',
    'surfaces',
    'forms',
    'overlays',
  ] as const;

  // Family 基线只审计 Element 内容；隐藏 Host 的 sticky Header，避免长分区滚动拼接时混入外壳。
  await page.getByRole('banner').evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
  for (const family of families) {
    await expect(page.locator(`#${family}`)).toHaveScreenshot(`showcase-family-${family}.png`);
  }
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
  await expect(page).toHaveScreenshot('mobile-navigation-open.png');
});

test('状态体系页面保持 Loading 与异常状态视觉基线', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/states');
  await expect(page.getByRole('heading', { name: '加载未完成' })).toBeVisible();
  await expect(page.getByRole('region', { name: '正在同步界面能力' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(page).toHaveScreenshot('states-desktop.png', { fullPage: true });
});

test('Overview、Reference Form 与 Preferences 真实页面进入视觉矩阵', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveScreenshot('overview-desktop.png', { fullPage: true });

  await page.goto('/reference/form');
  await expect(page.getByRole('heading', { name: '复杂设置与审批表单' })).toBeVisible();
  await expect(page).toHaveScreenshot('reference-form-desktop.png', { fullPage: true });

  await page.goto('/preferences');
  await expect(page.getByRole('heading', { name: '界面偏好' })).toBeVisible();
  await expect(page).toHaveScreenshot('preferences-desktop.png', { fullPage: true });
});

test('Toast、Destructive Confirm 与 Compact Density 开启态进入视觉矩阵', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/showcase?overlay=toast&density=compact');
  await expect(page.getByText('项目反馈已入队')).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-toast-compact.png');

  await page.goto('/showcase?overlay=confirm');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-destructive-confirm.png');
});

test('Reference 多选与分页的真实联动状态进入视觉矩阵', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reference');
  await expectReferenceReady(page);
  const rows = page.getByRole('grid').getByRole('row');
  await rows.nth(1).click();
  await rows.nth(2).click();
  await expect(page.getByText('已选 2 条')).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page).toHaveScreenshot('reference-multi-select.png', { fullPage: true });
});
