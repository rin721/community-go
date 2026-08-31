/* Pattern entry同时导出离开确认 Port 与视图组件，不是应用 Fast Refresh 边界。 */
/* eslint-disable react-refresh/only-export-components */
import type { FormLifecycle } from '@community-go/form-foundation';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import type { ReactNode } from 'react';

import { AdminStickyActions } from './layout';

export type AdminLeaveConfirmationPort = Readonly<{
  confirmLeave: (message: string) => Promise<boolean>;
}>;

export function requestAdminPageLeave({
  dirty,
  message,
  port,
}: Readonly<{
  dirty: boolean;
  message: string;
  port: AdminLeaveConfirmationPort;
}>): Promise<boolean> {
  return dirty ? port.confirmLeave(message) : Promise.resolve(true);
}

export function AdminFormStatus({
  lifecycle,
  labels,
}: Readonly<{
  lifecycle: FormLifecycle;
  labels: Readonly<Record<FormLifecycle, string>>;
}>) {
  const tone =
    lifecycle === 'submitted'
      ? 'success'
      : lifecycle === 'dirty' || lifecycle === 'invalid'
        ? 'warning'
        : 'neutral';
  return <StatusPill tone={tone}>{labels[lifecycle]}</StatusPill>;
}

export function AdminFormActions({
  secondary,
  primary,
  summary,
}: Readonly<{ secondary?: ReactNode; primary: ReactNode; summary?: ReactNode }>) {
  return (
    <AdminStickyActions>
      {summary ? <div className="mr-auto text-sm text-ink-muted">{summary}</div> : null}
      {secondary}
      {primary}
    </AdminStickyActions>
  );
}
