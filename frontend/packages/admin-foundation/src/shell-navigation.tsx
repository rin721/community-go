'use client';

import { flattenNavigationLeaves, isNavigationHrefActive } from '@community-go/core';
import type {
  NavigationBranch,
  NavigationGroup,
  NavigationLeaf,
  NavigationNode,
} from '@community-go/types';
import { IconAction } from '@community-go/ui-adapter/icon-action';
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
  expandedIds: ReadonlySet<string>;
  presenter: AdminNavigationPresenter;
  router: AdminRouterPort;
  onToggle: (id: string) => void;
  onNavigate?: (() => void) | undefined;
}>;

function ExpandedNode({
  node,
  activeLeafId,
  activeAncestorIds,
  expandedIds,
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

  const expanded = active || expandedIds.has(node.id);
  const childrenId = `admin-navigation-${node.id}`;
  return (
    <li>
      <div className="admin-navigation-branch-row">
        {router.renderLink({
          href: node.defaultHref,
          className: linkClassName,
          children: (
            <>
              {presenter.icon(node.id, active)}
              <span className="min-w-0 flex-1 truncate">{presenter.translate(node.labelKey)}</span>
            </>
          ),
          ...(onNavigate ? { onNavigate } : {}),
        })}
        <IconAction
          active={expanded}
          controls={childrenId}
          expanded={expanded}
          label={presenter.translate('shell.toggleNavigation', {
            label: presenter.translate(node.labelKey),
          })}
          onPress={() => onToggle(node.id)}
        >
          <span
            aria-hidden="true"
            className={`transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
          >
            ⌄
          </span>
        </IconAction>
      </div>
      {expanded ? (
        <ul className="ms-4 mt-1 space-y-1 border-s border-border ps-2" id={childrenId}>
          {node.children.map((child) => (
            <ExpandedNode
              activeAncestorIds={activeAncestorIds}
              activeLeafId={activeLeafId}
              expandedIds={expandedIds}
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
  expandedIds,
  presenter,
  router,
  onToggle,
  onNavigate,
}: Readonly<{
  branch: NavigationBranch;
  active: boolean;
  activeLeafId?: string | undefined;
  activeAncestorIds: ReadonlySet<string>;
  expandedIds: ReadonlySet<string>;
  presenter: AdminNavigationPresenter;
  router: AdminRouterPort;
  onToggle: (id: string) => void;
  onNavigate?: (() => void) | undefined;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <NavigationFlyout
      active={active}
      icon={presenter.icon(branch.id, active)}
      isOpen={open}
      label={presenter.translate(branch.labelKey)}
      onOpenChange={setOpen}
    >
      <ul className="space-y-1">
        {branch.children.map((child) => (
          <ExpandedNode
            activeAncestorIds={activeAncestorIds}
            activeLeafId={activeLeafId}
            expandedIds={expandedIds}
            key={child.id}
            node={child}
            onNavigate={() => {
              setOpen(false);
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
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const paths = flattenNavigationLeaves(groups.flatMap((group) => group.items));
  const activePath = paths.find(({ leaf }) =>
    isNavigationHrefActive(leaf.href, router.currentPath),
  );
  const activeAncestorIds = new Set(activePath?.ancestors.map(({ id }) => id));
  const onToggle = (id: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
                    expandedIds={expandedIds}
                    onNavigate={onNavigate}
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
              expandedIds={expandedIds}
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
