import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Governance Dashboard e2e —— Governance Control Plane UI 的真实验收。
 *
 * 验证：/governance/dashboard 渲染 Resolved Governance Model（正式 Authority /
 * 治理节点/能力），模型健康（无 error 诊断）；Axe WCAG AA 无违规。
 * 治理 Plugin 不拥有治理事实：删除本插件不影响真实 Authority（由
 * architecture/dependency gates 与既有测试保证，本 spec 只证明可视化入口可用）。
 */
test('governance dashboard 渲染 Resolved Governance Model 且模型健康', async ({ page }) => {
  await page.goto('/governance/dashboard');

  await expect(page.getByRole('heading', { name: /Frontend Governance/ })).toBeVisible();

  // 五个正式 Authority 均出现在页面（每个 Authority 以 title + authorityId 为 Section 标题）
  for (const authorityId of [
    'design-system',
    'surface-foundation',
    'ui-adapter',
    'state-foundation',
    'plugin-framework',
  ]) {
    await expect(page.getByText(authorityId, { exact: false }).first()).toBeVisible();
  }

  // 模型健康标记（无 error 诊断 → success StatusPill "模型健康"）
  await expect(page.getByText('模型健康（无 error 诊断）')).toBeVisible();
});

test('governance dashboard 无 Axe WCAG AA 违规', async ({ page }) => {
  await page.goto('/governance/dashboard');
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
