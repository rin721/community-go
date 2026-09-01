'use client';

import { BusyIndicator } from '@community-go/ui-adapter/busy-indicator';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';
import { AdminShellRoot } from '@community-go/admin-foundation/shell-navigation';
import { Skeleton } from '@community-go/ui-adapter/skeleton';

export function AppLoadingSurface({ label }: Readonly<{ label: string }>) {
  return (
    <AdminShellRoot collapsed={false}>
      <aside className="hidden h-screen flex-col border-r border-border bg-surface p-5 lg:flex">
        <Skeleton className="h-10 w-40" />
        <div className="mt-10 grid gap-5">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="h-9 w-full" key={index} />
          ))}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-20 items-center gap-4 border-b border-border bg-canvas px-4 sm:px-6 xl:px-8">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="hidden h-10 max-w-md flex-1 md:block" />
          <Skeleton className="ml-auto h-9 w-28" />
        </header>
        <main
          aria-busy="true"
          aria-label={label}
          className="mx-auto max-w-screen-2xl p-4 text-ink sm:p-6 xl:p-8"
        >
          <div className="mb-5 flex items-center gap-3" role="status">
            <BusyIndicator label={label} />
            <span className="text-sm font-semibold text-ink-muted">{label}</span>
          </div>
          <AdminPageLoadingSurface kind="page" label={label} />
        </main>
      </div>
    </AdminShellRoot>
  );
}
