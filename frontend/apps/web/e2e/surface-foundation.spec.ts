import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const archetypes = [
  '/page-archetypes/overview',
  '/page-archetypes/resource-list',
  '/page-archetypes/detail',
  '/page-archetypes/create-edit',
  '/page-archetypes/settings',
  '/page-archetypes/master-detail',
  '/page-archetypes/operation',
] as const;

const viewports = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

test('七类 Page Archetype 在四级视口可直接验收', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of archetypes) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${route} at ${viewport.width}px`).toBeLessThanOrEqual(0);

      if (viewport.width === 1440 || viewport.width === 390) {
        const accessibility = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(accessibility.violations, `${route} at ${viewport.width}px`).toEqual([]);
      }
    }
  }
});

test('Universal 与 Surface authority 视觉面保持分层', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/motion');
  await expect(page).toHaveScreenshot('universal-motion-desktop.png', { fullPage: true });

  await page.goto('/page-patterns/collections-data');
  await expect(page).toHaveScreenshot('page-patterns-collections-desktop.png', {
    fullPage: true,
  });

  await page.goto('/page-archetypes/overview');
  await expect(page).toHaveScreenshot('page-archetypes-overview-desktop.png', {
    fullPage: true,
  });
});
