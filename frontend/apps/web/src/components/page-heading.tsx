import type { ReactNode } from 'react';

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">{eyebrow}</p>
        <h1 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-ink-muted sm:text-base">{description}</p>
      </div>
      {action}
    </header>
  );
}
