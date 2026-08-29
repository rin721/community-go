import { Panel } from '@community-go/ui-adapter';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="space-y-6">{children}</div>;
}

export type BreadcrumbItem = Readonly<{
  label: string;
  current?: boolean;
}>;

export function PageBreadcrumbs({
  items,
  label,
}: Readonly<{ items: readonly BreadcrumbItem[]; label: string }>) {
  return (
    <nav aria-label={label}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-ink-muted">
        {items.map((item, index) => (
          <li className="flex min-w-0 items-center gap-1.5" key={`${item.label}-${index}`}>
            {index > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" /> : null}
            <span
              aria-current={item.current ? 'page' : undefined}
              className={item.current ? 'truncate font-semibold text-ink' : 'truncate'}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export type PageHeaderProps = Readonly<{
  eyebrow?: string;
  title: string;
  description: string;
  breadcrumbs?: readonly BreadcrumbItem[];
  breadcrumbLabel?: string;
  actions?: ReactNode;
}>;

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  breadcrumbLabel,
  actions,
}: PageHeaderProps) {
  return (
    <header className="space-y-4">
      {breadcrumbs && breadcrumbLabel ? (
        <PageBreadcrumbs items={breadcrumbs} label={breadcrumbLabel} />
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

export function PageToolbar({
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

export function PageFilterBar({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid gap-3 rounded-panel bg-surface-muted p-3 md:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}

export type PageSectionProps = Readonly<{
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  appearance?: 'elevated' | 'outlined' | 'embedded';
}>;

export function PageSection({
  title,
  description,
  action,
  children,
  appearance = 'elevated',
}: PageSectionProps) {
  return (
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
}

export function SplitView({ master, detail }: Readonly<{ master: ReactNode; detail: ReactNode }>) {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">{master}</div>
      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">{detail}</aside>
    </div>
  );
}

export function FooterActions({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <footer className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-3 rounded-panel border border-border bg-surface/95 px-4 py-3 shadow-overlay backdrop-blur-xl">
      {children}
    </footer>
  );
}
