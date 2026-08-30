import { tv } from '@heroui/styles';
import { Button as HeroButton } from '@heroui/react';
import type { ReactNode } from 'react';

type IconActionBehavior =
  | Readonly<{ onPress: () => void; disabled?: boolean }>
  | Readonly<{ onPress?: never; disabled: true }>;

export type IconActionProps = Readonly<{
  label: string;
  children: ReactNode;
  active?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md';
  tone?: 'neutral' | 'danger';
}> &
  IconActionBehavior;

const iconActionStyles = tv({
  base: 'shrink-0 rounded-control border outline-none transition-colors',
  compoundVariants: [
    {
      active: true,
      class: 'border-brand bg-brand-soft text-brand',
      tone: 'neutral',
    },
  ],
  defaultVariants: {
    active: false,
    size: 'md',
    tone: 'neutral',
  },
  variants: {
    active: {
      false: '',
      true: '',
    },
    size: {
      md: 'size-control min-w-control',
      sm: 'size-control-sm min-w-control-sm',
    },
    tone: {
      danger: 'border-danger/35 bg-danger-soft text-danger hover:bg-danger/15',
      neutral: 'border-border bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink',
    },
  },
});

export function IconAction({
  label,
  children,
  onPress,
  active = false,
  disabled = false,
  loading = false,
  size = 'md',
  tone = 'neutral',
}: IconActionProps) {
  return (
    <HeroButton
      aria-busy={loading || undefined}
      aria-label={label}
      className={iconActionStyles({ active, size, tone })}
      isDisabled={disabled}
      isIconOnly
      isPending={loading}
      variant="ghost"
      {...(onPress ? { onPress } : {})}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-icon-sm animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      ) : (
        children
      )}
    </HeroButton>
  );
}
