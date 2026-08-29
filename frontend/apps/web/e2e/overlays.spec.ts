import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function assertOverlayAccessibility(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
}

async function assertMatchesTriggerWidth(page: Page, slot: string) {
  await page.waitForTimeout(250);
  const metrics = await page.locator(`[data-slot="${slot}"]`).evaluate((element) => ({
    popupWidth: element.getBoundingClientRect().width,
    triggerWidth: Number.parseFloat(getComputedStyle(element).getPropertyValue('--trigger-width')),
  }));
  expect(metrics.triggerWidth).toBeGreaterThan(0);
  expect(Math.abs(metrics.popupWidth - metrics.triggerWidth)).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/showcase');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('组件与组合行为实验场');
});

test('Alert、Badge、Card 与 Notification 形成可访问的内部权威面', async ({ page }) => {
  await expect(page.getByRole('region', { name: '更改已经保存' })).toBeVisible();
  await expect(page.getByLabel('Badge 语义与外观')).toContainText('成功');
  await expect(page.getByRole('region', { name: '新的基座能力可用' })).toBeVisible();
  await page.getByRole('button', { name: '关闭通知' }).click();
  await expect(page.getByRole('region', { name: '通知已关闭' })).toBeVisible();
  await page.getByRole('button', { name: '恢复通知' }).click();
  await expect(page.getByRole('region', { name: '新的基座能力可用' })).toBeVisible();
  await assertOverlayAccessibility(page);
});

test('Select 与 Combobox 使用统一 Popup、键盘和选中状态', async ({ page }) => {
  await page.getByLabel('Select').click();
  const selectListbox = page.getByRole('listbox');
  await expect(selectListbox).toBeVisible();
  await expect(page.getByRole('option', { name: '自动执行' })).toBeDisabled();
  await assertMatchesTriggerWidth(page, 'select-popover');
  await expect(selectListbox).toHaveCSS('overflow-y', 'auto');
  await expect(page).toHaveScreenshot('showcase-select-open.png');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');

  const combo = page.getByRole('combobox', { name: 'Combobox' });
  await combo.click();
  await combo.fill('Mika');
  await expect(page.getByRole('option', { name: 'Mika Sato' })).toBeVisible();
  await assertMatchesTriggerWidth(page, 'combo-box-popover');
  await expect(page.getByRole('listbox')).toHaveCSS('overflow-y', 'auto');
  await expect(page).toHaveScreenshot('showcase-combobox-open.png');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await assertOverlayAccessibility(page);
});

test('Dropdown、Popover 与 Tooltip 展开面进入视觉回归', async ({ page }) => {
  await page.getByRole('button', { name: 'Dropdown Menu' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-menu-open.png');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Popover' }).click();
  await expect(page.getByRole('dialog', { name: '组合提示' })).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-popover-open.png');
  await page.keyboard.press('Escape');

  const tooltipTrigger = page.getByRole('button', { name: 'Tooltip' });
  await tooltipTrigger.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-tooltip-open.png');
});

test('DatePicker 与 Command 展开面支持键盘及无障碍扫描', async ({ page }) => {
  await page.getByRole('button', { name: '日历 DatePicker' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-date-picker-open.png');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Command' }).click();
  const commandDialog = page.getByRole('dialog');
  await expect(commandDialog).toContainText('快速跳转');
  await page.getByLabel('搜索命令').fill('状态');
  await expect(page.getByRole('option', { name: /状态体系/ })).toBeVisible();
  await assertOverlayAccessibility(page);
  await expect(page).toHaveScreenshot('showcase-command-open.png');
});

test('Dialog 与 Drawer 锁定焦点并支持 Escape 恢复 Trigger', async ({ page }) => {
  const dialogTrigger = page.getByRole('button', { name: 'Dialog' });
  await dialogTrigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await expect(page).toHaveScreenshot('showcase-dialog-open.png');
  await page.keyboard.press('Escape');
  await expect(dialogTrigger).toBeFocused();

  const drawerTrigger = page.getByRole('button', { name: 'Drawer' });
  await drawerTrigger.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toContainText('辅助配置');
  await assertOverlayAccessibility(page);
  await expect(page).toHaveScreenshot('showcase-drawer-open.png');
  await page.keyboard.press('Escape');
  await expect(drawerTrigger).toBeFocused();
});
