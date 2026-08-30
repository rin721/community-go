import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('DataTable 暴露单选、键盘与空集合契约', async ({ page }) => {
  await page.goto('/showcase');

  const table = page.getByRole('grid', { name: 'UI Element 治理状态' });
  await expect(table).toBeVisible();
  await expect(page.getByRole('rowheader', { name: /Semantic Tokens/ })).toBeVisible();

  const rows = table.getByRole('row');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1)).toHaveAttribute('data-selected', 'true');

  await rows.nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(rows.nth(2)).toHaveAttribute('data-selected', 'true');

  await page.getByRole('button', { name: '查看空集合' }).click();
  await expect(page.getByText('当前筛选条件下没有 UI Element。')).toBeVisible();
  await expect(table).toBeVisible();
  await expect(table).toHaveScreenshot('showcase-data-table-empty.png');

  await page.getByRole('button', { name: '恢复数据行' }).click();
  await expect(page.getByRole('rowheader', { name: /Form Control/ })).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
