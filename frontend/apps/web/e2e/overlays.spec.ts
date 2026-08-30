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

async function assertListboxScrolls(page: Page) {
  const listbox = page.getByRole('listbox');
  await expect(listbox).toHaveCSS('overflow-y', 'auto');
  const initialMetrics = await listbox.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  }));
  expect(initialMetrics.scrollHeight).toBeGreaterThan(initialMetrics.clientHeight);
  expect(initialMetrics.scrollTop).toBe(0);

  await page.keyboard.press('End');
  const scrolledTop = await listbox.evaluate((element) => element.scrollTop);
  expect(scrolledTop).toBeGreaterThan(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/showcase');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('组件与组合行为实验场');
});

test('Action 区分可操作、Pending 与 Disabled 状态', async ({ page }) => {
  const primary = page.getByRole('button', { name: '主要操作' });
  const small = page.getByRole('button', { name: '小尺寸' });
  const loading = page.getByRole('button', { name: '处理中' });
  const disabled = page.getByRole('button', { name: '不可用' });

  await expect(primary).toBeEnabled();
  await primary.focus();
  await expect(primary).toBeFocused();

  const primaryHeight = await primary.evaluate((element) => element.getBoundingClientRect().height);
  const smallHeight = await small.evaluate((element) => element.getBoundingClientRect().height);
  expect(smallHeight).toBeLessThan(primaryHeight);

  await expect(loading).toHaveAttribute('data-pending', 'true');
  await expect(loading).toHaveAttribute('aria-disabled', 'true');
  await expect(loading).toBeDisabled();
  await expect(disabled).not.toHaveAttribute('data-pending');
  await expect(disabled).toBeDisabled();
  await assertOverlayAccessibility(page);
});

test('Alert、Badge、Card 与 Notification 形成可访问的内部权威面', async ({ page }) => {
  const staticAlert = page.getByRole('region', { name: '更改已经保存' });
  await expect(staticAlert).toBeVisible();
  await expect(staticAlert).not.toHaveAttribute('role', 'status');
  await expect(staticAlert).not.toHaveAttribute('role', 'alert');
  await expect(page.getByLabel('Badge 语义与外观')).toContainText('成功');
  await expect(page.getByRole('region', { name: '新的基座能力可用' })).toBeVisible();
  await page.getByRole('button', { name: '稍后处理' }).click();
  await expect(page.getByRole('region', { name: '通知已关闭' })).toBeVisible();
  await page.getByRole('button', { name: '恢复通知' }).click();
  await expect(page.getByRole('region', { name: '新的基座能力可用' })).toBeVisible();
  await page.getByRole('button', { name: '关闭通知' }).click();
  await expect(page.getByRole('region', { name: '通知已关闭' })).toBeVisible();
  await assertOverlayAccessibility(page);
});

test('Status 与 Progress 保持对象状态和确定进度语义', async ({ page }) => {
  const tones = page.getByLabel('StatusPill 语义色');
  await expect(tones).toContainText('默认');
  await expect(tones).toContainText('成功');
  await expect(tones).toContainText('警告');
  await expect(tones).toContainText('危险');
  await expect(tones).toContainText('信息');

  const progress = page.getByRole('progressbar', { name: 'UI Element 契约完成度' });
  await expect(progress).toHaveAttribute('aria-valuemin', '0');
  await expect(progress).toHaveAttribute('aria-valuemax', '100');
  await expect(progress).toHaveAttribute('aria-valuenow', '64');
  await expect(page.getByText('64%')).toBeVisible();
  await expect(progress.locator('[data-slot="progress-bar-fill"]')).toHaveAttribute(
    'style',
    /width: 64%/,
  );
  await assertOverlayAccessibility(page);
});

test('Tabs 保持 HeroUI 键盘语义并由父 Surface 提供内边距', async ({ page }) => {
  const tablist = page.getByRole('tablist', { name: '状态组合 Tabs' });
  const normalTab = tablist.getByRole('tab', { name: '正常' });
  const emptyTab = tablist.getByRole('tab', { name: '空状态' });
  const warningTab = tablist.getByRole('tab', { name: '警告' });

  await expect(normalTab).toHaveAttribute('aria-selected', 'true');
  const inset = await tablist.evaluate((element) => {
    const surface = element.closest('section');
    if (!surface) return null;
    const tablistRect = element.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    return {
      left: tablistRect.left - surfaceRect.left,
      right: surfaceRect.right - tablistRect.right,
      top: tablistRect.top - surfaceRect.top,
    };
  });
  expect(inset).not.toBeNull();
  expect(inset?.left).toBeGreaterThanOrEqual(12);
  expect(inset?.right).toBeGreaterThanOrEqual(12);
  expect(inset?.top).toBeGreaterThanOrEqual(12);

  await normalTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(emptyTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: '这里还没有内容' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(warningTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: '部分能力受到限制' })).toBeVisible();
  await assertOverlayAccessibility(page);
});

test('Select 与 Combobox 使用统一 Popup、键盘和选中状态', async ({ page }) => {
  await page.getByLabel('Select').click();
  const selectListbox = page.getByRole('listbox');
  await expect(selectListbox).toBeVisible();
  await expect(page.getByRole('option', { name: '自动执行' })).toBeDisabled();
  await assertMatchesTriggerWidth(page, 'select-popover');
  await assertListboxScrolls(page);
  await expect(page.getByRole('option', { name: '执行队列 12' })).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-select-open.png');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '执行队列 12 Select' })).toBeVisible();

  const combo = page.getByRole('combobox', { name: 'Combobox' });
  await combo.click();
  await expect(page.getByRole('option', { name: 'Omar Haddad' })).toBeDisabled();
  await assertMatchesTriggerWidth(page, 'combo-box-popover');
  await assertListboxScrolls(page);
  await page.keyboard.press('Escape');
  await combo.click();
  await combo.fill('Mika');
  await expect(page.getByRole('option', { name: 'Mika Sato' })).toBeVisible();
  await assertMatchesTriggerWidth(page, 'combo-box-popover');
  await expect(page).toHaveScreenshot('showcase-combobox-open.png');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(combo).toHaveValue('Mika Sato');
  await assertOverlayAccessibility(page);
});

test('Dropdown、Popover 与 Tooltip 展开面进入视觉回归', async ({ page }) => {
  const menuTrigger = page.getByRole('button', { name: 'Dropdown Menu' });
  await menuTrigger.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page).toHaveScreenshot('showcase-menu-open.png');
  await page.keyboard.press('Escape');
  await expect(menuTrigger).toBeFocused();

  const popoverTrigger = page.getByRole('button', { name: 'Popover' });
  const pageHeightBeforeOpen = await page
    .locator('html')
    .evaluate((element) => element.scrollHeight);
  const triggerRect = await popoverTrigger.evaluate((element) => element.getBoundingClientRect());
  await popoverTrigger.click();
  const popover = page.getByRole('dialog', { name: '组合提示' });
  await expect(popover).toBeVisible();
  const popoverRect = await popover.evaluate((element) => element.getBoundingClientRect());
  expect(popoverRect.top).toBeGreaterThanOrEqual(triggerRect.bottom);
  await expect(popover).toBeFocused();
  const pageHeightAfterOpen = await page
    .locator('html')
    .evaluate((element) => element.scrollHeight);
  expect(pageHeightAfterOpen).toBe(pageHeightBeforeOpen);
  await expect(page).toHaveScreenshot('showcase-popover-open.png');
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(popoverTrigger).toBeFocused();

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
