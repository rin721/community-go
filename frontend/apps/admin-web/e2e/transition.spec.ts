import { expect, test, type Page } from '@playwright/test';

// 页面转场验证：View Transitions API 只在客户端导航时播放，无法用等待断言捕获，
// 因此在页面内启动 rAF 轮询 watcher，记录转场动画（effect.pseudoElement 命中
// ::view-transition-*）的最大时长与动画名。
// 开始时先访问目标路由一次（warm）再回到起点导航：目标路由数据已缓存，导航会以
// 单次提交完成，方向滑动确定性播放；未缓存路由的首次导航可能拆帧
// （route data 迟到/useSearchParams Suspense），属于官方已说明的降级行为。
type TransitionRecord = {
  sawTransition: boolean;
  maxDurationMs: number;
  animationNames: string[];
};

async function startTransitionWatcher(page: Page) {
  await page.evaluate(() => {
    const record: TransitionRecord = { sawTransition: false, maxDurationMs: 0, animationNames: [] };
    (window as unknown as { __transitionWatch?: TransitionRecord }).__transitionWatch = record;
    const startedAt = performance.now();
    const poll = () => {
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as (KeyframeEffect & { pseudoElement?: string }) | null;
        if (effect?.pseudoElement?.includes('view-transition')) {
          record.sawTransition = true;
          const name = (animation as CSSAnimation).animationName;
          if (name && !record.animationNames.includes(name)) record.animationNames.push(name);
          const duration = Number(effect.getComputedTiming().duration ?? 0);
          if (Number.isFinite(duration)) {
            record.maxDurationMs = Math.max(record.maxDurationMs, duration);
          }
        }
      }
      if (performance.now() - startedAt < 3000) requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
}

async function readTransitionRecord(page: Page): Promise<TransitionRecord> {
  return page.evaluate(() => {
    return (
      (window as unknown as { __transitionWatch?: TransitionRecord }).__transitionWatch ?? {
        sawTransition: false,
        maxDurationMs: 0,
        animationNames: [],
      }
    );
  });
}

async function expectHydrated(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
}

// 先访问目标路由（warm 路由缓存），再回到起点，保证后续点击走缓存路由、
// 单次提交完成转场；随后在侧栏导航到目标。
async function warmAndNavigate(page: Page, targetUrl: string, leafName: string) {
  await page.goto(targetUrl);
  await expectHydrated(page);
  await page.goto('/');
  await expectHydrated(page);

  await startTransitionWatcher(page);
  await navigateViaSidebar(page, leafName);
}

async function navigateViaSidebar(page: Page, leafName: string) {
  const navigation = page.getByRole('navigation', { name: '主导航' });
  await navigation.getByRole('button', { name: '展开或收起UI Elements' }).click();
  await navigation.getByRole('link', { name: leafName }).click();
}

// 等待页面动画（含 View Transition）完全结束，保证后续导航从干净状态开始：
// 快速连发导航时 React/浏览器的转场类型上下文可能尚未释放，会导致断言歧义。
async function waitForTransitionsToSettle(page: Page) {
  await expect
    .poll(async () => {
      const running = await page.evaluate(() => {
        for (const animation of document.getAnimations()) {
          const effect = animation.effect as (KeyframeEffect & { pseudoElement?: string }) | null;
          if (
            effect?.pseudoElement?.includes('view-transition') &&
            animation.playState === 'running'
          ) {
            return true;
          }
        }
        return false;
      });
      return !running;
    })
    .toBe(true);
}

test('无 Suspense 页面深入导航播放完整方向滑动并清理临时样式', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // warm /foundations 使其走缓存路由，导航单次提交、方向滑动确定性播放
  await page.goto('/foundations');
  await expectHydrated(page);
  await page.goto('/');
  await expectHydrated(page);

  await startTransitionWatcher(page);
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '基座能力' })
    .click();

  await expect(page).toHaveURL(/\/foundations$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // 等待转场（最长时间约 360ms）完整结束，包含 React 的样式还原
  await page.waitForTimeout(600);

  const record = await readTransitionRecord(page);
  expect(record.sawTransition).toBe(true);
  // nav-forward 播放方向滑动：退出与进入的位移动画都必须被观察到
  expect(record.animationNames).toContain('admin-screen-slide-in');
  expect(record.animationNames).toContain('admin-screen-slide-out');
  expect(record.maxDurationMs).toBeGreaterThanOrEqual(200);

  // 转场结束后 React 必须还原临时 inline 样式（view-transition-name/class）
  const leftoverCount = await page.evaluate(() => {
    let count = 0;
    for (const element of document.querySelectorAll('main, main *')) {
      const style = (element as HTMLElement).style;
      if (style.viewTransitionName || style.viewTransitionClass) count += 1;
    }
    return count;
  });
  expect(leftoverCount).toBe(0);
});

test('Family 页面导航在拆帧场景下保持功能正确且动画不失控', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // warm /ui-elements/overlays；Family 页含 useSearchParams/Suspense，
  // 即使走缓存路由也可能在首帧后补挂内容，滑动“整体必现”不作强制断言
  await warmAndNavigate(page, '/ui-elements/overlays', '浮层与弹出界面');

  await expect(page).toHaveURL(/\/ui-elements\/overlays$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overlay 与 Floating Layer');
  await page.waitForTimeout(600);

  const record = await readTransitionRecord(page);
  // 导航功能正确（URL/标题断言已覆盖）；任何被观察到的动画时长都处于预算内（≤500ms）
  if (record.sawTransition) {
    expect(record.maxDurationMs).toBeLessThanOrEqual(500);
  }
});

test('减弱动态效果时转场时长接近零且无位移', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await warmAndNavigate(page, '/ui-elements/overlays', '浮层与弹出界面');

  await expect(page).toHaveURL(/\/ui-elements\/overlays$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overlay 与 Floating Layer');
  await page.waitForTimeout(600);

  const record = await readTransitionRecord(page);
  // 即使观察到动画，时长也必须被压低到 0.01ms 级，不产生可感知位移
  if (record.sawTransition) {
    expect(record.maxDurationMs).toBeLessThan(50);
  }
});

test('浏览器后退不播放方向滑动并正确恢复页面', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // 保持简单历史栈：goto '/' 后前进到 overlays，再后退回 '/'；
  // 前进段不承担任何滑动断言，无需预热
  await page.goto('/');
  await expectHydrated(page);
  await navigateViaSidebar(page, '浮层与弹出界面');
  await expect(page).toHaveURL(/\/ui-elements\/overlays$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overlay 与 Floating Layer');
  // 等上一转场完全结束，避免快速后退时上下文尚未释放
  await waitForTransitionsToSettle(page);

  await startTransitionWatcher(page);
  await page.goBack();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForTimeout(600);

  const record = await readTransitionRecord(page);
  // 浏览器后退不携带转场类型（官方行为）：页面瞬时切换，绝不出现 nav-forward 的方向滑动
  expect(record.animationNames).not.toContain('admin-screen-slide-in');
  expect(record.animationNames).not.toContain('admin-screen-slide-out');
});
