'use client';

import { useLayoutEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { completeRouteNavigation, commitResolvedHref } from './navigation-lifecycle';

/**
 * RouteTransition —— Host 单点协调 Router commit 观测与内容 reveal。
 *
 * 职责分离：
 * - 导航生命周期：对 resolved location（pathname + search + hash）的**任一**实际变化
 *   调用 completeRouteNavigation 收敛活跃导航事务（同 URL 自导航 / search-only /
 *   hash-only 也必须收敛，避免 pendingCount 遗留）。首次挂载只建立基线。
 * - 视觉转场：只在 pathname 真正变化时设置 data-route-enter / data-route-kind，
 *   由 admin-foundation 的 CSS recipe（route-content choreography / 方向位移）消费。
 *   search/hash-only 变化不重放。**不依赖 React ViewTransition 实验组件**
 *   （stable react 不导出该 API）；方向过渡由 data-route-kind + Motion Token 的
 *   纯 CSS 动画实现，reduced-motion 由全局 Motion Policy 统一降级。
 *
 * 防误触发：useSearchParams 的对象身份不保证稳定（可能随渲染变化），因此本组件
 * 比较**序列化后的 resolved href**，只有真实变化才触发 complete / 转场标记。
 * SSR 首帧不读 window（hash 在客户端 effect 内读取）。
 */
export function RouteTransition({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef<string | null>(null);
  const previousResolvedHrefRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const element = contentRef.current;
    const search = searchParams.toString();
    const hash = typeof window === 'undefined' ? '' : window.location.hash;
    const resolvedHref = `${pathname}${search ? `?${search}` : ''}${hash}`;
    if (!element) return;

    // 首次挂载：只建立基线（pathname 与 resolved href），不触发完成信号。
    if (previousResolvedHrefRef.current === null) {
      previousPathnameRef.current = pathname;
      previousResolvedHrefRef.current = resolvedHref;
      commitResolvedHref(resolvedHref);
      return;
    }

    // resolved href 未变（渲染级重复执行）：不触发任何信号。
    if (previousResolvedHrefRef.current === resolvedHref) return;
    previousResolvedHrefRef.current = resolvedHref;

    // 任何 resolved location 实际变化都收敛导航事务（pathname / search / hash 任一变化）。
    completeRouteNavigation(resolvedHref);

    // 视觉转场只跟随 pathname 变化；search/hash-only 不重放页面进入动画。
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    element.dataset.routeEnter = 'true';
    element.dataset.routeKind =
      document.documentElement.dataset.routeIntent === 'forward' ? 'forward' : 'content';
    delete document.documentElement.dataset.routeIntent;
  }, [pathname, searchParams]);

  return (
    <div
      className="admin-route-content min-w-0"
      data-motion-recipe="route-content"
      data-route-enter="false"
      key={pathname}
      ref={contentRef}
    >
      {children}
    </div>
  );
}
