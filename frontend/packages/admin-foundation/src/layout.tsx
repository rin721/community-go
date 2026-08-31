import { BreadcrumbTrail } from '@community-go/ui-adapter/navigation';
import { Panel } from '@community-go/ui-adapter/panel';
import type { ReactNode } from 'react';

export function AdminPage({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="space-y-admin-page">{children}</div>;
}

export type AdminBreadcrumbItem = Readonly<{
  label: string;
  current?: boolean;
}>;

export type AdminPageHeaderProps = Readonly<{
  eyebrow?: string;
  title: string;
  description: string;
  breadcrumbs?: readonly AdminBreadcrumbItem[];
  breadcrumbLabel?: string;
  actions?: ReactNode;
}>;

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  breadcrumbLabel,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="space-y-4">
      {breadcrumbs && breadcrumbLabel ? (
        <BreadcrumbTrail
          items={breadcrumbs.map((item, index) => ({
            id: `breadcrumb-${index}`,
            label: item.label,
            ...(item.current ? {} : { disabled: true }),
          }))}
          label={breadcrumbLabel}
        />
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-widest text-brand">{eyebrow}</p>
          ) : null}
          <h1
            className={`${eyebrow ? 'mt-3' : ''} text-balance text-3xl font-extrabold tracking-tight text-ink sm:text-4xl`}
          >
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-ink-muted sm:text-base">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function AdminToolbar({
  label,
  primary,
  secondary,
}: Readonly<{ label: string; primary: ReactNode; secondary?: ReactNode }>) {
  return (
    <div
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-surface p-3 shadow-sm"
      role="toolbar"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{primary}</div>
      {secondary ? <div className="flex flex-wrap items-center gap-2">{secondary}</div> : null}
    </div>
  );
}

export function AdminFilterBar({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="admin-filter-grid rounded-panel bg-surface-muted p-3">{children}</div>;
}

export type AdminSectionProps = Readonly<{
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  appearance?: 'elevated' | 'outlined' | 'embedded';
}>;

export function AdminSection({
  id,
  title,
  description,
  action,
  children,
  appearance = 'elevated',
}: AdminSectionProps) {
  const section = (
    <Panel appearance={appearance} className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </Panel>
  );

  return id ? (
    <div className="scroll-mt-24" id={id}>
      {section}
    </div>
  ) : (
    section
  );
}

export function AdminSplitView({
  master,
  detail,
}: Readonly<{ master: ReactNode; detail: ReactNode }>) {
  return (
    <div className="admin-split-view">
      <div className="min-w-0">{master}</div>
      <aside className="admin-split-detail">{detail}</aside>
    </div>
  );
}

export function AdminStickyActions({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <footer className="sticky bottom-3 z-shell flex flex-wrap items-center justify-end gap-3 rounded-panel border border-border bg-surface/95 px-4 py-3 shadow-overlay backdrop-blur-xl">
      {children}
    </footer>
  );
}
