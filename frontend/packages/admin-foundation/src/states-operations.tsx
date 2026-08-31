import { ProgressMeter } from '@community-go/ui-adapter/progress-meter';
import { StateSurface } from '@community-go/ui-adapter/state-surface';
import type { ReactNode } from 'react';

export type AdminOperationState = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type AdminViewState =
  'ready' | 'loading' | 'empty' | 'error' | 'partial' | 'readonly' | 'denied' | 'pending';

/** AdminStateRegion 统一页面/Region 状态替换；数据请求、权限和任务计算仍由 Feature 提供。 */
export function AdminStateRegion({
  state,
  label,
  content,
  loading,
  empty,
  error,
  partialNotice,
  readonlyNotice,
  denied,
  pending,
}: Readonly<{
  state: AdminViewState;
  label: string;
  content: ReactNode;
  loading: ReactNode;
  empty: ReactNode;
  error: ReactNode;
  partialNotice: ReactNode;
  readonlyNotice: ReactNode;
  denied: ReactNode;
  pending: ReactNode;
}>) {
  const replacement =
    state === 'loading'
      ? loading
      : state === 'empty'
        ? empty
        : state === 'error'
          ? error
          : state === 'denied'
            ? denied
            : state === 'pending'
              ? pending
              : null;

  return (
    <section aria-busy={state === 'loading' || undefined} aria-label={label}>
      {replacement ?? (
        <div className="grid gap-4">
          {state === 'partial' ? partialNotice : null}
          {state === 'readonly' ? readonlyNotice : null}
          {content}
        </div>
      )}
    </section>
  );
}

export function AdminOperationStatus({
  state,
  title,
  description,
  icon,
  progress,
  progressLabel,
  actions,
}: Readonly<{
  state: AdminOperationState;
  title: string;
  description: string;
  icon: ReactNode;
  progress?: number;
  progressLabel?: string;
  actions?: ReactNode;
}>) {
  const surfaceState =
    state === 'failed'
      ? 'error'
      : state === 'succeeded'
        ? 'success'
        : state === 'cancelled'
          ? 'warning'
          : 'pending';
  return (
    <div className="space-y-4">
      <StateSurface state={surfaceState} title={title} description={description} icon={icon} />
      {progress !== undefined && progressLabel ? (
        <ProgressMeter value={progress} label={progressLabel} />
      ) : null}
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
