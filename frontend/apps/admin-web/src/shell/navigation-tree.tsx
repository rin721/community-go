'use client';

import {
  AdminShellNavigation,
  type AdminNavigationPresenter,
  type AdminRouterPort,
} from '@community-go/admin-foundation/shell-navigation';
import { useFrontendTranslation } from '@community-go/i18n';
import type { NavigationGroup } from '@community-go/types';
import {
  Boxes,
  Circle,
  Component,
  Contact,
  FilePenLine,
  Layers3,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  MessageSquareWarning,
  MousePointerClick,
  PanelsTopLeft,
  Settings2,
  Table2,
  TableProperties,
  Waypoints,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createElement } from 'react';

import { markForwardRouteIntent, pageTransitionTypes } from '../host/route-transition-constants';
import { shouldProceedWithNavigation } from '../host/navigation-lifecycle';

const iconByNavigationId: Readonly<Record<string, LucideIcon>> = {
  overview: LayoutDashboard,
  foundations: Boxes,
  reference: TableProperties,
  referenceWorkspace: TableProperties,
  formReference: FilePenLine,
  uiElements: Component,
  uiActionsSelection: MousePointerClick,
  uiFeedback: MessageSquareWarning,
  uiStatusAsync: LoaderCircle,
  uiIdentityDisplay: Contact,
  uiNavigation: Waypoints,
  uiData: Table2,
  uiSurfaces: PanelsTopLeft,
  uiForms: ListChecks,
  uiOverlays: Layers3,
  states: Workflow,
  preferences: Settings2,
  'reference-resources': TableProperties,
};

export function NavigationTree({
  groups,
  compact = false,
  onNavigate,
}: Readonly<{
  groups: readonly NavigationGroup[];
  compact?: boolean;
  onNavigate?: (() => void) | undefined;
}>) {
  const { t } = useFrontendTranslation();
  const currentPath = usePathname();
  const router: AdminRouterPort = {
    currentPath,
    renderLink: ({ href, className, children, ariaLabel, title, onNavigate: onLinkNavigate }) => (
      <Link
        className={className}
        href={href}
        transitionTypes={[pageTransitionTypes.forward]}
        {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
        {...(title ? { title } : {})}
        onClick={(event) => {
          // no-op 短路：目标与当前 resolved location 等价时不导航、不启动 Progress。
          // 仍需触发 onNavigate（移动端关闭菜单、Flyout 关闭等副作用）。
          const proceed = shouldProceedWithNavigation(href, t('shell.primaryNav'));
          if (onLinkNavigate) queueMicrotask(onLinkNavigate);
          if (!proceed) {
            event.preventDefault();
            return;
          }
          markForwardRouteIntent();
        }}
      >
        {children}
      </Link>
    ),
  };
  const presenter: AdminNavigationPresenter = {
    translate: (key, values) => (values ? t(key, values) : t(key)),
    icon: (id, active) =>
      createElement(iconByNavigationId[id] ?? Circle, {
        className: 'size-4 shrink-0',
        strokeWidth: active ? 2.3 : 1.9,
      }),
  };

  return (
    <AdminShellNavigation
      compact={compact}
      groups={groups}
      presenter={presenter}
      router={router}
      {...(onNavigate ? { onNavigate } : {})}
    />
  );
}
