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
import { beginNavigation } from '../host/navigation-progress';

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
        onClick={() => {
          markForwardRouteIntent();
          beginNavigation(t('shell.primaryNav'));
          if (onLinkNavigate) queueMicrotask(onLinkNavigate);
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
