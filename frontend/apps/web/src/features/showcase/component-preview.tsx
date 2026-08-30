import { Badge, Panel } from '@community-go/ui-adapter';
import type { ReactNode } from 'react';

export type ComponentPreviewProps = Readonly<{
  name: string;
  description: string;
  states: readonly string[];
  children: ReactNode;
  fullWidth?: boolean;
  embedded?: boolean;
}>;

export function ComponentPreview({
  name,
  description,
  states,
  children,
  fullWidth = false,
  embedded = false,
}: ComponentPreviewProps) {
  return (
    <Panel
      appearance={embedded ? 'embedded' : 'outlined'}
      className={`min-w-0 overflow-hidden ${fullWidth ? 'lg:col-span-2' : ''}`}
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-ink">{name}</h3>
          <div aria-label={`${name} states`} className="flex flex-wrap justify-end gap-1.5">
            {states.map((state) => (
              <Badge key={state}>{state}</Badge>
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
      </div>
      <div className="p-4">{children}</div>
    </Panel>
  );
}
