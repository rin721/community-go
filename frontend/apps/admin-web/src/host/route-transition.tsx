'use client';

import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ViewTransition, type ReactNode } from 'react';

import { completeNavigation } from './navigation-progress';
import { routeTransitionClasses } from './route-transition-constants';

/** RouteTransition 在 Host 单点协调 Router 与 Suspense reveal，不渲染空间外壳。 */
export function RouteTransition({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    if (previousPathnameRef.current === null) {
      previousPathnameRef.current = pathname;
      return;
    }
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    element.dataset.routeEnter = 'true';
    element.dataset.routeKind =
      document.documentElement.dataset.routeIntent === 'forward' ? 'forward' : 'content';
    delete document.documentElement.dataset.routeIntent;

    // 导航提交完成：pathname 已切换、新路由内容已挂载，结束当前全局导航。
    completeNavigation();
  }, [pathname]);

  return (
    <ViewTransition default="none" enter={routeTransitionClasses} exit={routeTransitionClasses}>
      <div
        className="admin-route-content min-w-0"
        data-motion-recipe="route-content"
        data-route-enter="false"
        key={pathname}
        ref={contentRef}
      >
        {children}
      </div>
    </ViewTransition>
  );
}
