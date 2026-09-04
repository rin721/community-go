import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('偏好页的 Toggle Group、Submit、Saved 与 Toast 状态真实联动', async ({ page }) => {
  await page.goto('/system-tools/preferences');
  const density = page.getByRole('radiogroup', { name: '信息密度' });
  await expect(density.getByRole('radio', { name: '舒适' })).toBeChecked();
  await density.getByRole('radio', { name: '紧凑' }).click();
  await expect(density.getByRole('radio', { name: '紧凑' })).toBeChecked();

  const reduceMotion = page.getByRole('switch', { name: /减少动效/ });
  await reduceMotion.focus();
  await page.keyboard.press('Space');
  await expect(reduceMotion).toBeChecked();
  await page.getByRole('button', { name: '保存偏好' }).click();
  await expect(page.getByText('偏好已保存到当前设备')).toHaveCount(2);

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
