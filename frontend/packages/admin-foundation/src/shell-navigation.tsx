'use client';

import { flattenNavigationLeaves, isNavigationHrefActive } from '@community-go/core';
import type {
  NavigationBranch,
  NavigationGroup,
  NavigationLeaf,
  NavigationNode,
} from '@community-go/types';
import { NavigationFlyout } from '@community-go/ui-adapter/navigation-flyout';
import { useState, type ReactNode } from 'react';

export type AdminNavigationLink = Readonly<{
  href: string;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
  title?: string;
  onNavigate?: () => void;
}>;

export type AdminRouterPort = Readonly<{
  currentPath: string;
  renderLink: (link: AdminNavigationLink) => ReactNode;
}>;

export type AdminNavigationPresenter = Readonly<{
  translate: (key: string, values?: Readonly<Record<string, unknown>>) => string;
  icon: (id: string, active: boolean) => ReactNode;
}>;

type TreeNodeProps = Readonly<{
  node: NavigationNode;
  activeLeafId?: string | undefined;
  activeAncestorIds: ReadonlySet<string>;
  expandedOverrides: ReadonlyMap<string, boolean>;
  presenter: AdminNavigationPresenter;
  router: AdminRouterPort;
  onToggle: (id: string, expanded: boolean) => void;
  onNavigate?: (() => void) | undefined;
}>;

function ExpandedNode({
  node,
  activeLeafId,
  activeAncestorIds,
  expandedOverrides,
  presenter,
  router,
  onToggle,
  onNavigate,
}: TreeNodeProps) {
  const active = node.kind === 'leaf' ? node.id === activeLeafId : activeAncestorIds.has(node.id);
  const linkClassName = `group flex min-h-10 items-center gap-3 rounded-control px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
  }`;

  if (node.kind === 'leaf') {
    return (
      <li>
        {router.renderLink({
          href: node.href,
          className: linkClassName,
          children: (
            <>
              {presenter.icon(node.id, active)}
              <span className="min-w-0 flex-1 truncate">{presenter.translate(node.labelKey)}</span>
            </>
          ),
          ...(onNavigate ? { onNavigate } : {}),
        })}
      </li>
    );
  }

  const expanded = expandedOverrides.get(node.id) ?? active;
  const childrenId = `admin-navigation-${node.id}`;
  return (
    <li>
      <button
        aria-controls={childrenId}
        aria-expanded={expanded}
        aria-label={presenter.translate('shell.toggleNavigation', {
          label: presenter.translate(node.labelKey),
        })}
        className={`${linkClassName} w-full border-0 bg-transparent text-start`}
        onClick={() => onToggle(node.id, expanded)}
        type="button"
      >
        {presenter.icon(node.id, active)}
        <span className="min-w-0 flex-1 truncate">{presenter.translate(node.labelKey)}</span>
        <svg
          aria-hidden="true"
          className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 16 16"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </button>
      {expanded ? (
        <ul className="ms-4 mt-1 space-y-1 border-s border-border ps-2" id={childrenId}>
          {node.children.map((child) => (
            <ExpandedNode
              activeAncestorIds={activeAncestorIds}
              activeLeafId={activeLeafId}
              expandedOverrides={expandedOverrides}
              key={child.id}
              node={child}
              onNavigate={onNavigate}
              onToggle={onToggle}
              presenter={presenter}
              router={router}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CompactLeaf({
  leaf,
  active,
  presenter,
  router,
  onNavigate,
}: Readonly<{
  leaf: NavigationLeaf;
  active: boolean;
  presenter: AdminNavigationPresenter;
  router: AdminRouterPort;
  onNavigate?: (() => void) | undefined;
}>) {
  const label = presenter.translate(leaf.labelKey);
  return router.renderLink({
    href: leaf.href,
    ariaLabel: label,
    title: label,
    className: `flex h-11 items-center justify-center rounded-control px-2 transition-colors ${
      active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
    }`,
    children: presenter.icon(leaf.id, active),
    ...(onNavigate ? { onNavigate } : {}),
  });
}

function CompactBranch({
  branch,
  active,
  activeLeafId,
  activeAncestorIds,
  expandedOverrides,
  presenter,
  router,
  isOpen,
  onToggle,
  onOpenChange,
  onNavigate,
}: Readonly<{
  branch: NavigationBranch;
  active: boolean;
  activeLeafId?: string | undefined;
  activeAncestorIds: ReadonlySet<string>;
  expandedOverrides: ReadonlyMap<string, boolean>;
  presenter: AdminNavigationPresenter;
  router: AdminRouterPort;
  isOpen: boolean;
  onToggle: (id: string, expanded: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (() => void) | undefined;
}>) {
  return (
    <NavigationFlyout
      active={active}
      icon={presenter.icon(branch.id, active)}
      isOpen={isOpen}
      label={presenter.translate(branch.labelKey)}
      onOpenChange={onOpenChange}
    >
      <ul className="space-y-1">
        {branch.children.map((child) => (
          <ExpandedNode
            activeAncestorIds={activeAncestorIds}
            activeLeafId={activeLeafId}
            expandedOverrides={expandedOverrides}
            key={child.id}
            node={child}
            onNavigate={() => {
              onOpenChange(false);
              onNavigate?.();
            }}
            onToggle={onToggle}
            presenter={presenter}
            router={router}
          />
        ))}
      </ul>
    </NavigationFlyout>
  );
}

/** AdminShellNavigation 只消费 Router Port，不感知 Next、History 或 Desktop Runtime。 */
export function AdminShellNavigation({
  groups,
  router,
  presenter,
  compact = false,
  onNavigate,
}: Readonly<{
  groups: readonly NavigationGroup[];
  router: AdminRouterPort;
  presenter: AdminNavigationPresenter;
  compact?: boolean;
  onNavigate?: (() => void) | undefined;
}>) {
  const [expandedOverrides, setExpandedOverrides] = useState<ReadonlyMap<string, boolean>>(
    new Map(),
  );
  // Compact 模式同一时刻只允许一个父级 Flyout 打开：兄弟切换时立即替换，
  // 旧 Flyout 的延迟关闭回调只能关闭自身，不能误关新菜单。
  const [openBranchId, setOpenBranchId] = useState<string | null>(null);
  const paths = flattenNavigationLeaves(groups.flatMap((group) => group.items));
  const activePath = paths.find(({ leaf }) =>
    isNavigationHrefActive(leaf.href, router.currentPath),
  );
  const activeAncestorIds = new Set(activePath?.ancestors.map(({ id }) => id));
  const onToggle = (id: string, expanded: boolean) =>
    setExpandedOverrides((current) => {
      const next = new Map(current);
      next.set(id, !expanded);
      return next;
    });

  return groups.map((group) => (
    <div key={group.id}>
      {compact ? null : (
        <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
          {presenter.translate(group.labelKey)}
        </p>
      )}
      <ul className="space-y-1">
        {group.items.map((node) => {
          const active =
            node.kind === 'leaf' ? node.id === activePath?.leaf.id : activeAncestorIds.has(node.id);
          if (compact) {
            return (
              <li key={node.id}>
                {node.kind === 'leaf' ? (
                  <CompactLeaf
                    active={active}
                    leaf={node}
                    onNavigate={onNavigate}
                    presenter={presenter}
                    router={router}
                  />
                ) : (
                  <CompactBranch
                    active={active}
                    activeAncestorIds={activeAncestorIds}
                    activeLeafId={activePath?.leaf.id}
                    branch={node}
                    expandedOverrides={expandedOverrides}
                    isOpen={openBranchId === node.id}
                    onNavigate={onNavigate}
                    onOpenChange={(open) => setOpenBranchId(open ? node.id : null)}
                    onToggle={onToggle}
                    presenter={presenter}
                    router={router}
                  />
                )}
              </li>
            );
          }
          return (
            <ExpandedNode
              activeAncestorIds={activeAncestorIds}
              activeLeafId={activePath?.leaf.id}
              expandedOverrides={expandedOverrides}
              key={node.id}
              node={node}
              onNavigate={onNavigate}
              onToggle={onToggle}
              presenter={presenter}
              router={router}
            />
          );
        })}
      </ul>
    </div>
  ));
}

/** AdminShellLayout 拥有后台 Shell 的稳定布局，Host 只注入导航、平台操作和页面内容。 */
export function AdminShellRoot({
  children,
  collapsed = false,
}: Readonly<{ children: ReactNode; collapsed?: boolean }>) {
  return (
    <div
      className="admin-shell-grid min-h-screen bg-canvas text-ink"
      data-sidebar={collapsed ? 'collapsed' : 'expanded'}
    >
      {children}
    </div>
  );
}

export function AdminShellLayout({
  sidebar,
  mobileNavigation,
  header,
  children,
  collapsed = false,
}: Readonly<{
  sidebar: ReactNode;
  mobileNavigation?: ReactNode;
  header: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
}>) {
  return (
    <AdminShellRoot collapsed={collapsed}>
      <aside
        className="sticky top-0 hidden h-screen flex-col border-e border-border bg-surface lg:flex"
        style={{ viewTransitionName: 'app-sidebar' }}
      >
        {sidebar}
      </aside>
      {mobileNavigation}
      <div className="min-w-0">
        <header
          className="sticky top-0 z-sticky flex h-20 items-center gap-3 border-b border-border bg-canvas/90 px-4 backdrop-blur-xl sm:px-6 xl:px-8"
          style={{ viewTransitionName: 'app-header' }}
        >
          {header}
        </header>
        <main className="mx-auto max-w-screen-2xl p-4 sm:p-6 xl:p-8">{children}</main>
      </div>
    </AdminShellRoot>
  );
}
