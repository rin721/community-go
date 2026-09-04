import type { ReactNode } from 'react';
import { Action } from '@community-go/ui-adapter/action';

import { Section } from './layout';

export function Collection({
  title,
  description,
  toolbar,
  filters,
  content,
  narrowContent,
  pagination,
}: Readonly<{
  title: string;
  description?: string;
  toolbar?: ReactNode;
  filters?: ReactNode;
  content: ReactNode;
  narrowContent?: ReactNode;
  pagination?: ReactNode;
}>) {
  return (
    <Section title={title} {...(description ? { description } : {})}>
      {toolbar ? <div className="border-b border-border p-4">{toolbar}</div> : null}
      {filters ? <div className="border-b border-border p-4">{filters}</div> : null}
      <div className={narrowContent ? 'hidden min-w-0 md:block' : 'min-w-0'}>{content}</div>
      {narrowContent ? <div className="min-w-0 md:hidden">{narrowContent}</div> : null}
      {pagination ? <div className="border-t border-border p-4">{pagination}</div> : null}
    </Section>
  );
}

export function BulkActionBar({
  selectionLabel,
  actions,
  onClear,
  clearLabel,
}: Readonly<{
  selectionLabel: string;
  actions: ReactNode;
  onClear: () => void;
  clearLabel: string;
}>) {
  return (
    <div
      aria-label={selectionLabel}
      className="surface-bulk-bar flex flex-wrap items-center justify-between gap-3 rounded-panel border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-ink"
      role="toolbar"
    >
      <span aria-live="polite" className="font-semibold">
        {selectionLabel}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <Action size="sm" variant="quiet" onPress={onClear}>
          {clearLabel}
        </Action>
      </div>
    </div>
  );
}
