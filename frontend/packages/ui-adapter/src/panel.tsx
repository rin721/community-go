import type { HTMLAttributes, ReactNode } from 'react';

export type PanelProps = Readonly<{
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'muted' | 'brand';
}> &
  Pick<HTMLAttributes<HTMLElement>, 'aria-label'>;

const toneClass = {
  default: 'border-border bg-surface',
  muted: 'border-transparent bg-surface-muted',
  brand: 'border-brand/15 bg-brand-soft',
} as const;

export function Panel({ children, className = '', tone = 'default', ...aria }: PanelProps) {
  return (
    <section
      className={`rounded-panel border shadow-panel ${toneClass[tone]} ${className}`}
      {...aria}
    >
      {children}
    </section>
  );
}
