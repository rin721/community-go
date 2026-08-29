import type { ReactNode } from 'react';

import { Action } from './action';
import { IconAction } from './icon-action';

export type FeedbackTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const softToneClass: Record<FeedbackTone, string> = {
  neutral: 'border-border bg-surface-muted text-ink',
  success: 'border-success/35 bg-success-soft text-success',
  warning: 'border-warning/35 bg-warning-soft text-warning',
  danger: 'border-danger/35 bg-danger-soft text-danger',
  info: 'border-info/35 bg-info-soft text-info',
};

const solidToneClass: Record<FeedbackTone, string> = {
  neutral: 'bg-ink text-surface',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  info: 'bg-info text-white',
};

export type BadgeProps = Readonly<{
  children: ReactNode;
  tone?: FeedbackTone;
  appearance?: 'soft' | 'solid';
  size?: 'sm' | 'md';
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}>;

export function Badge({
  children,
  tone = 'neutral',
  appearance = 'soft',
  size = 'sm',
  leadingIcon,
  trailingIcon,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full font-semibold ${
        appearance === 'solid' ? solidToneClass[tone] : softToneClass[tone]
      } ${size === 'sm' ? 'gap-1 px-2.5 py-1 text-xs' : 'gap-1.5 px-3 py-1.5 text-sm'}`}
    >
      {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
      <span className="truncate">{children}</span>
      {trailingIcon ? <span aria-hidden="true">{trailingIcon}</span> : null}
    </span>
  );
}

export type AlertBannerProps = Readonly<{
  title: string;
  description: string;
  tone?: Exclude<FeedbackTone, 'neutral'>;
  icon: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  announcement?: 'none' | 'polite' | 'urgent';
}>;

export function AlertBanner({
  title,
  description,
  tone = 'info',
  icon,
  actionLabel,
  onAction,
  announcement = 'none',
}: AlertBannerProps) {
  return (
    <section
      aria-label={title}
      className={`flex items-start gap-3 rounded-panel border p-4 ${softToneClass[tone]}`}
      {...(announcement === 'urgent'
        ? { role: 'alert' as const }
        : announcement === 'polite'
          ? { role: 'status' as const }
          : {})}
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface/70">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
        {actionLabel && onAction ? (
          <div className="mt-3">
            <Action variant="secondary" size="sm" onPress={onAction}>
              {actionLabel}
            </Action>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type NotificationCardProps = Readonly<{
  title: string;
  description: string;
  icon: ReactNode;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  dismissLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  onDismiss: () => void;
}>;

export function NotificationCard({
  title,
  description,
  icon,
  primaryActionLabel,
  secondaryActionLabel,
  dismissLabel,
  onPrimaryAction,
  onSecondaryAction,
  onDismiss,
}: NotificationCardProps) {
  return (
    <section
      aria-label={title}
      className="relative rounded-panel border border-border bg-surface p-5"
    >
      <div className="flex items-start gap-3 pr-10">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-soft text-brand">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {secondaryActionLabel ? (
          <Action
            variant="secondary"
            size="sm"
            {...(onSecondaryAction ? { onPress: onSecondaryAction } : {})}
          >
            {secondaryActionLabel}
          </Action>
        ) : null}
        <Action size="sm" onPress={onPrimaryAction}>
          {primaryActionLabel}
        </Action>
      </div>
      <div className="absolute right-3 top-3">
        <IconAction label={dismissLabel} onPress={onDismiss}>
          <span aria-hidden="true">×</span>
        </IconAction>
      </div>
    </section>
  );
}
