import { Button as HeroButton } from '@heroui/react';
import type { ReactNode } from 'react';

export type ActionProps = Readonly<{
  children: ReactNode;
  leadingIcon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onPress?: () => void;
}>;

const variantClass = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-strong',
  secondary: 'border border-border bg-surface text-ink hover:bg-surface-muted',
  quiet: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
  danger: 'bg-danger-soft text-danger hover:brightness-95',
} as const;

const sizeClass = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
} as const;

export function Action({
  children,
  leadingIcon,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  type = 'button',
  onPress,
}: ActionProps) {
  return (
    <HeroButton
      className={`gap-2 rounded-control font-semibold transition-all ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? 'w-full' : ''}`}
      isDisabled={disabled}
      type={type}
      {...(onPress ? { onPress } : {})}
    >
      {leadingIcon}
      {children}
    </HeroButton>
  );
}
