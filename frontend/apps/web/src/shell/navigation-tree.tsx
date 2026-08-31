'use client';

import { flattenNavigationLeaves, isNavigationHrefActive } from '@community-go/core';
import type {
  NavigationBranch,
  NavigationGroup,
  NavigationLeaf,
  NavigationNode,
} from '@community-go/types';
import { NavigationFlyout } from '@community-go/ui-adapter/navigation-flyout';
import {
  Boxes,
  ChevronDown,
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
import { createElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { pageTransitionTypes } from '../host/page-transition-constants';

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

function getNavigationIcon(id: string): LucideIcon {
  return iconByNavigationId[id] ?? Circle;
}

function NavigationIcon({
  id,
  className,
  strokeWidth,
}: Readonly<{ id: string; className: string; strokeWidth: number }>) {
  return createElement(getNavigationIcon(id), { className, strokeWidth });
}

type TreeNodeProps = Readonly<{
  node: NavigationNode;
  activeLeafId?: string | undefined;
  activeAncestorIds: ReadonlySet<string>;
  expandedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onNavigate?: (() => void) | undefined;
}>;

function ExpandedTreeNode({
  node,
  activeLeafId,
  activeAncestorIds,
  expandedIds,
  onToggle,
  onNavigate,
}: TreeNodeProps) {
  const { t } = useTranslation();

  if (node.kind === 'leaf') {
    const active = node.id === activeLeafId;
    return (
      <li>
        <Link
          className={`group flex min-h-10 items-center gap-3 rounded-control px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}
          href={node.href}
          transitionTypes={[pageTransitionTypes.forward]}
          {...(onNavigate ? { onClick: onNavigate } : {})}
        >
          <NavigationIcon
            className="size-4 shrink-0"
            id={node.id}
            strokeWidth={active ? 2.3 : 1.9}
          />
          <span className="min-w-0 flex-1 truncate">{t(node.labelKey)}</span>
        </Link>
      </li>
    );
  }

  const active = activeAncestorIds.has(node.id);
  const expanded = active || expandedIds.has(node.id);
  const childrenId = `shell-navigation-${node.id}`;
  return (
    <li>
      <div
        className={`flex min-h-10 items-center rounded-control transition-colors ${active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}
      >
        <Link
          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-sm font-semibold"
          href={node.defaultHref}
          transitionTypes={[pageTransitionTypes.forward]}
          {...(onNavigate ? { onClick: onNavigate } : {})}
        >
          <NavigationIcon
            className="size-4 shrink-0"
            id={node.id}
            strokeWidth={active ? 2.3 : 1.9}
          />
          <span className="min-w-0 flex-1 truncate">{t(node.labelKey)}</span>
        </Link>
        <button
          aria-controls={childrenId}
          aria-expanded={expanded}
          aria-label={t('shell.toggleNavigation', { label: t(node.labelKey) })}
          className="mr-1 grid size-8 shrink-0 place-items-center rounded-control hover:bg-surface"
          type="button"
          onClick={() => onToggle(node.id)}
        >
          <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded ? (
        <ul className="ml-4 mt-1 space-y-1 border-l border-border pl-2" id={childrenId}>
          {node.children.map((child) => (
            <ExpandedTreeNode
              activeAncestorIds={activeAncestorIds}
              activeLeafId={activeLeafId}
              expandedIds={expandedIds}
              key={child.id}
              node={child}
              onNavigate={onNavigate}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CompactBranch({
  branch,
  active,
  activeLeafId,
  activeAncestorIds,
  expandedIds,
  onToggle,
  onNavigate,
}: Readonly<{
  branch: NavigationBranch;
  active: boolean;
  activeLeafId?: string | undefined;
  activeAncestorIds: ReadonlySet<string>;
  expandedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onNavigate?: (() => void) | undefined;
}>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <NavigationFlyout
      active={active}
      icon={<NavigationIcon className="size-4.5" id={branch.id} strokeWidth={active ? 2.3 : 1.9} />}
      isOpen={open}
      label={t(branch.labelKey)}
      onOpenChange={setOpen}
    >
      <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-widest text-ink-muted">
        {t(branch.labelKey)}
      </p>
      <ul className="space-y-1">
        {branch.children.map((child) => (
          <ExpandedTreeNode
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
          />
        ))}
      </ul>
    </NavigationFlyout>
  );
}

function CompactLeaf({
  leaf,
  active,
  onNavigate,
}: Readonly<{
  leaf: NavigationLeaf;
  active: boolean;
  onNavigate?: (() => void) | undefined;
}>) {
  const { t } = useTranslation();
  return (
    <Link
      aria-label={t(leaf.labelKey)}
      className={`flex h-11 items-center justify-center rounded-control px-2 transition-colors ${active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}
      title={t(leaf.labelKey)}
      href={leaf.href}
      transitionTypes={[pageTransitionTypes.forward]}
      {...(onNavigate ? { onClick: onNavigate } : {})}
    >
      <NavigationIcon className="size-4.5" id={leaf.id} strokeWidth={active ? 2.3 : 1.9} />
    </Link>
  );
}

export function NavigationTree({
  groups,
  compact = false,
  onNavigate,
}: Readonly<{
  groups: readonly NavigationGroup[];
  compact?: boolean;
  onNavigate?: (() => void) | undefined;
}>) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const leafPaths = flattenNavigationLeaves(groups.flatMap((group) => group.items));
  const activePath = leafPaths.find(({ leaf }) => isNavigationHrefActive(leaf.href, pathname));
  const activeAncestorIds = new Set(activePath?.ancestors.map(({ id }) => id));
  const onToggle = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return groups.map((group) => (
    <div key={group.id}>
      {compact ? null : (
        <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
          {t(group.labelKey)}
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
                  <CompactLeaf active={active} leaf={node} onNavigate={onNavigate} />
                ) : (
                  <CompactBranch
                    active={active}
                    activeAncestorIds={activeAncestorIds}
                    activeLeafId={activePath?.leaf.id}
                    branch={node}
                    expandedIds={expandedIds}
                    onNavigate={onNavigate}
                    onToggle={onToggle}
                  />
                )}
              </li>
            );
          }
          return (
            <ExpandedTreeNode
              activeAncestorIds={activeAncestorIds}
              activeLeafId={activePath?.leaf.id}
              expandedIds={expandedIds}
              key={node.id}
              node={node}
              onNavigate={onNavigate}
              onToggle={onToggle}
            />
          );
        })}
      </ul>
    </div>
  ));
}
