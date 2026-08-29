import { Button as HeroButton } from '@heroui/react';
import type { ReactNode } from 'react';

export type IconActionProps = Readonly<{
  label: string;
  children: ReactNode;
  onPress?: () => void;
  active?: boolean;
}>;

export function IconAction({ label, children, onPress, active = false }: IconActionProps) {
  return (
    <HeroButton
      aria-label={label}
      className={`size-10 min-w-10 rounded-control border transition-colors ${active ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink'}`}
      isIconOnly
      {...(onPress ? { onPress } : {})}
    >
      {children}
    </HeroButton>
  );
}
