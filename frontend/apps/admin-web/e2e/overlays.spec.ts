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

test('九个 Family 页面逐项公开全部 UI Element', async ({ page }) => {
  test.setTimeout(60_000);
  const families = [
    {
      path: '/ui-elements/actions-selection',
      elements: ['Action', 'IconAction', 'ToggleGroup'],
    },
    {
      path: '/ui-elements/feedback',
      elements: ['AlertBanner', 'Badge', 'NotificationCard', 'FeedbackProvider / Toast'],
    },
    {
      path: '/ui-elements/status-async',
      elements: [
        'StatusPill',
        'ProgressMeter',
        'BusyIndicator',
        'Skeleton',
        'StateSurface',
        'LiveRegion',
        'SkipLink',
      ],
    },
    {
      path: '/ui-elements/identity-display',
      elements: ['Avatar', 'UserIdentity', 'ReadyImage', 'DescriptionList'],
    },
    {
      path: '/ui-elements/navigation',
      elements: [
        'TextLink',
        'BreadcrumbTrail',
        'PaginationControl',
        'TabsView',
        'StepNavigation',
        'Tree',
        'DisclosurePanel',
      ],
    },
    { path: '/ui-elements/data', elements: ['DataTable'] },
    {
      path: '/ui-elements/surfaces',
      elements: ['Card / CardHeader / CardContent / CardFooter', 'Panel'],
    },
    {
      path: '/ui-elements/forms',
      elements: [
        'TextField',
        'TextAreaField',
        'SearchBox',
        'SelectField',
        'ComboField',
        'DatePickerField',
        'CheckboxField',
        'RadioGroupField',
        'SwitchField',
        'FormErrorSummary',
      ],
    },
    {
      path: '/ui-elements/overlays',
      elements: [
        'MenuButton',
        'PopoverCard',
        'TooltipAction',
        'DialogSurface',
        'ConfirmDialog',
        'DestructiveConfirmDialog',
        'DrawerSurface',
        'CommandMenu',
      ],
    },
  ] as const;

  expect(families.flatMap(({ elements }) => elements)).toHaveLength(46);
  for (const family of families) {
    await page.goto(family.path);
    await expect(
      page.getByRole('navigation', { name: 'UI Elements 分类导航' }).getByRole('link'),
    ).toHaveCount(9);
    await expect(page.getByText('公开 Element 46 / 46')).toBeVisible();
    for (const element of family.elements) {
      await expect(page.getByRole('heading', { level: 3, name: element, exact: true })).toHaveCount(
        1,
      );
      await expect(page.getByLabel(`${element} states`, { exact: true })).toBeAttached();
    }
    await assertOverlayAccessibility(page);
  }
});

test('Action 区分可操作、Pending 与 Disabled 状态', async ({ page }) => {
  await page.goto('/ui-elements/actions-selection');
  const primary = page.getByRole('button', { name: '主要操作' });
  const small = page.getByRole('button', { name: '小尺寸' });
  const loading = page.getByRole('button', { name: '处理中', exact: true });
  const disabled = page.getByRole('button', { name: '不可用', exact: true });

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

test('ToggleGroup 与 DataTable 状态矩阵具有真实联动', async ({ page }) => {
  await page.goto('/ui-elements/actions-selection');
  const viewMode = page.getByRole('radiogroup', { name: '视图模式' });
  await viewMode.getByRole('radio', { name: '列表' }).click();
  await expect(viewMode.getByRole('radio', { name: '列表' })).toBeChecked();
  await expect(viewMode.getByRole('radio', { name: '不可用' })).toBeDisabled();

  const visibleColumns = page.getByRole('toolbar', { name: '可见列' });
  await visibleColumns.getByRole('button', { name: '状态' }).click();
  await expect(visibleColumns.getByRole('button', { name: '状态' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await page.goto('/ui-elements/data');
  const tableMode = page.getByRole('radiogroup', { name: '表格状态' });
  await tableMode.getByRole('radio', { name: '多选' }).click();
  const rows = page.getByRole('grid', { name: 'UI Element 治理状态' }).getByRole('row');
  await rows.nth(1).click();
  await rows.nth(2).click();
  await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(rows.nth(2)).toHaveAttribute('aria-selected', 'true');

  await tableMode.getByRole('radio', { name: '查看空集合' }).click();
  await expect(page.getByText('当前筛选条件下没有 UI Element。')).toBeVisible();
});

test('Alert、Badge、Card 与 Notification 形成可访问的内部权威面', async ({ page }) => {
  await page.goto('/ui-elements/feedback');
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
  await page.getByRole('button', { name: 'info', exact: true }).click();
  await expect(page.getByText('项目反馈已入队')).toBeVisible();
  await assertOverlayAccessibility(page);
});

test('危险确认使用 AlertDialog 语义且确认动作真实可执行', async ({ page }) => {
  await page.goto('/ui-elements/overlays?overlay=confirm');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('仅清除当前 UI Elements 中的本地动作状态。');
  await assertOverlayAccessibility(page);
  const trigger = page.getByRole('button', { name: '危险确认' });
  await page.getByRole('button', { name: '取消' }).click();
  await expect(dialog).toBeHidden();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: '确认删除' })).toBeVisible();
});

test('普通 ConfirmDialog 与危险确认保持独立契约', async ({ page }) => {
  await page.goto('/ui-elements/overlays?overlay=confirm-primary');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('不会写入后端、文件或外部系统。');
  await expect(dialog.getByRole('button', { name: '确认' })).toBeEnabled();
  await assertOverlayAccessibility(page);
  await dialog.getByRole('button', { name: '取消' }).click();
  const trigger = page.getByRole('button', { name: '普通确认' });
  await trigger.click();
  await page.getByRole('alertdialog').getByRole('button', { name: '取消' }).click();
  await expect(trigger).toBeFocused();
});

test('Toast 与 Data 状态可通过确定性 URL 直接验证', async ({ page }) => {
  await page.goto('/ui-elements/feedback?overlay=toast');
  await expect(page.getByText('项目反馈已入队')).toBeVisible();

  await page.goto('/ui-elements/data?data=empty');
  await expect(page.getByText('当前筛选条件下没有 UI Element。')).toBeVisible();
});

test('Status 与 Progress 保持对象状态和确定进度语义', async ({ page }) => {
  await page.goto('/ui-elements/status-async');
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
  await expect(progress.getByText('64%')).toBeVisible();
  const progressWidth = await progress
    .locator('[data-slot="progress-bar-fill"]')
    .evaluate((element) => (element as HTMLElement).style.width);
  expect(progressWidth).toBe('64%');
  await assertOverlayAccessibility(page);
});

test('Tabs 保持 HeroUI 键盘语义并由父 Surface 提供内边距', async ({ page }) => {
  await page.goto('/ui-elements/surfaces');
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
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

  await normalTab.press('ArrowRight');
  await expect(emptyTab).toBeFocused();
  await expect(emptyTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: '这里还没有内容' })).toBeVisible();
  await emptyTab.press('ArrowRight');
  await expect(warningTab).toBeFocused();
  await expect(warningTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: '部分能力受到限制' })).toBeVisible();
  await assertOverlayAccessibility(page);
});

test('TabsView line 与 section Variant 保持独立且状态一致', async ({ page }) => {
  await page.goto('/ui-elements/navigation');
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');

  // Showcase 同时展示 line（默认）与 section 两个 Variant
  const tablists = page.getByRole('tablist');
  await expect(tablists).toHaveCount(2);

  // line：透明 TabList、无圆角、底部有 1px 基线
  const line = tablists.nth(0);
  await expect(line).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(line).toHaveCSS('border-bottom-width', '1px');
  const lineBorderColor = await line.evaluate(
    (element) => getComputedStyle(element).borderBottomColor,
  );
  expect(lineBorderColor).toBe('rgb(228, 231, 238)'); // --ds-border light

  // section：浅色 surface 容器、顶部圆角、无全宽 divider
  const section = tablists.nth(1);
  const sectionBg = await section.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(sectionBg).toBe('rgb(240, 242, 247)'); // --ds-surface-muted light
  await expect(section).toHaveCSS('border-bottom-width', '0px');

  // 两个 Variant 的选中态一致：brand 前景 + semibold（状态模型统一）
  for (const tablist of [line, section]) {
    const selected = tablist.getByRole('tab', { name: '正常' });
    await expect(selected).toHaveAttribute('aria-selected', 'true');
    await expect(selected).toHaveCSS('color', 'rgb(93, 73, 214)'); // --ds-brand light
    await expect(selected).toHaveCSS('font-weight', '600');
    const borderColor = await selected.evaluate(
      (element) => getComputedStyle(element).borderBottomColor,
    );
    expect(borderColor).toBe('rgb(93, 73, 214)'); // brand 下划线 indicator
  }

  // 切换 section 的 Tab：键盘与选中态仍正确（从"正常"向右移到"空状态"）
  await section.getByRole('tab', { name: '正常' }).press('ArrowRight');
  await expect(section.getByRole('tab', { name: '空状态' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('Select 与 Combobox 使用统一 Popup、键盘和选中状态', async ({ page }) => {
  await page.goto('/ui-elements/forms');
  await page.getByRole('button', { name: '引导执行 Select' }).click();
  const selectListbox = page.getByRole('listbox');
  await expect(selectListbox).toBeVisible();
  await expect(page.getByRole('option', { name: '自动执行' })).toBeDisabled();
  await assertMatchesTriggerWidth(page, 'select-popover');
  await assertListboxScrolls(page);
  await expect(page.getByRole('option', { name: '执行队列 12' })).toBeVisible();
  await expect(page).toHaveScreenshot('ui-elements-select-open.png');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '执行队列 12 Select' })).toBeVisible();

  const combo = page.getByRole('combobox', { name: 'Combobox' });
  await combo.click();
  await expect(page.getByRole('option', { name: 'Omar Haddad' })).toBeDisabled();
  await assertMatchesTriggerWidth(page, 'combo-box-popover');
  await assertListboxScrolls(page);

  // ComboField 只有一个 Field Surface：InputGroup 不承担边框/阴影，边框落在内部 Input 上
  const comboInputGroup = page.locator('[data-slot="combo-box-input-group"]').first();
  await expect(comboInputGroup).not.toHaveClass(/ui-field-control/);
  const comboSurface = page
    .locator('[data-slot="combo-box-input-group"] [data-slot="input"]')
    .first();
  await expect(comboSurface).toHaveClass(/ui-field-control/);

  await page.keyboard.press('Escape');
  await combo.click();
  await combo.fill('Mika');
  await expect(page.getByRole('option', { name: 'Mika Sato' })).toBeVisible();
  await assertMatchesTriggerWidth(page, 'combo-box-popover');
  await expect(page).toHaveScreenshot('ui-elements-combobox-open.png');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(combo).toHaveValue('Mika Sato');
  await assertOverlayAccessibility(page);
});

test('Dropdown、Popover 与 Tooltip 展开面进入视觉回归', async ({ page }) => {
  await page.goto('/ui-elements/overlays');
  const menuTrigger = page.getByRole('button', { name: 'Dropdown Menu' });
  await menuTrigger.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page).toHaveScreenshot('ui-elements-menu-open.png');
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
  await expect(page).toHaveScreenshot('ui-elements-popover-open.png');
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(popoverTrigger).toBeFocused();

  const tooltipTrigger = page.getByRole('button', { name: 'Tooltip' });
  await tooltipTrigger.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await expect(page).toHaveScreenshot('ui-elements-tooltip-open.png');
});

test('DatePicker 与 Command 展开面支持键盘及无障碍扫描', async ({ page }) => {
  await page.goto('/ui-elements/forms');
  const datePickerTrigger = page.getByRole('button', { name: '日历 DatePicker' });
  // 触发元素位于首屏之外：先滚动进入视口再点击，避免打开弹层时的滚动定位竞态
  // （页面转场组件加入后，点击视口外触发器会偶发改变锚点测量结果）
  await datePickerTrigger.evaluate((element) =>
    element.scrollIntoView({ behavior: 'instant', block: 'center' }),
  );
  await datePickerTrigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveScreenshot('ui-elements-date-picker-open.png');
  await page.keyboard.press('Escape');

  await page.goto('/ui-elements/overlays');
  await page.getByRole('button', { name: 'Command' }).click();
  const commandDialog = page.getByRole('dialog');
  await expect(commandDialog).toContainText('快速跳转');
  // CommandMenu 复用 SearchBox：输入框是 SearchField.Input，不再出现嵌套的通用 data-slot="input"
  await expect(commandDialog.locator('[data-slot="search-field-input"]')).toHaveCount(1);
  await expect(commandDialog.locator('[data-slot="input"]')).toHaveCount(0);
  await page.getByLabel('搜索命令').fill('状态');
  await expect(page.getByRole('option', { name: /状态体系/ })).toBeVisible();
  await assertOverlayAccessibility(page);
  await expect(page).toHaveScreenshot('ui-elements-command-open.png');
});

test('Dialog 与 Drawer 锁定焦点并支持 Escape 恢复 Trigger', async ({ page }) => {
  await page.goto('/ui-elements/overlays');
  const dialogTrigger = page.getByRole('button', { name: 'Dialog' });
  await dialogTrigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await expect(page).toHaveScreenshot('ui-elements-dialog-open.png');
  await page.keyboard.press('Escape');
  await expect(dialogTrigger).toBeFocused();

  const drawerTrigger = page.getByRole('button', { name: 'Drawer' });
  await drawerTrigger.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toContainText('辅助配置');
  await assertOverlayAccessibility(page);
  await expect(page).toHaveScreenshot('ui-elements-drawer-open.png');
  await page.keyboard.press('Escape');
  await expect(drawerTrigger).toBeFocused();
});
