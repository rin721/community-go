import { Popover } from '@heroui/react/popover';
import { useEffect, useRef, type ReactNode } from 'react';

const navigationFlyoutCloseDelayMs = 140;

export type NavigationFlyoutProps = Readonly<{
  label: string;
  icon: ReactNode;
  active?: boolean;
  isOpen: boolean;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
}>;

export function NavigationFlyout({
  label,
  icon,
  active = false,
  isOpen,
  children,
  onOpenChange,
}: NavigationFlyoutProps) {
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef(false);
  const suppressPointerOpenRef = useRef(false);
  const suppressOpenUntilRef = useRef(0);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };
  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => onOpenChange(false), navigationFlyoutCloseDelayMs);
  };

  const handleOpenChange = (open: boolean) => {
    if (open && suppressPointerOpenRef.current) return;
    if (!open) {
      suppressOpenUntilRef.current = Date.now() + navigationFlyoutCloseDelayMs;
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false;
        suppressPointerOpenRef.current = true;
        setTimeout(() => triggerRef.current?.focus(), 0);
      }
    }
    onOpenChange(open);
  };

  useEffect(() => () => cancelScheduledClose(), []);
  useEffect(() => {
    if (isOpen) dialogContentRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  return (
    <Popover isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger<'button'>
        aria-label={label}
        className={`flex h-11 w-full items-center justify-center rounded-control transition-colors ${active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}
        title={label}
        render={({ ref, ...triggerProps }) => (
          <button
            {...triggerProps}
            ref={(element) => {
              triggerRef.current = element;
              if (typeof ref === 'function') ref(element);
              else if (ref) ref.current = element;
            }}
            type="button"
          />
        )}
        onFocus={(event) => {
          if (suppressPointerOpenRef.current) return;
          if (Date.now() < suppressOpenUntilRef.current) return;
          if (event.currentTarget.matches(':focus-visible')) onOpenChange(true);
        }}
        onMouseEnter={() => {
          if (suppressPointerOpenRef.current) return;
          if (Date.now() < suppressOpenUntilRef.current) return;
          cancelScheduledClose();
          onOpenChange(true);
        }}
        onMouseLeave={() => {
          suppressPointerOpenRef.current = false;
          scheduleClose();
        }}
        onPointerDown={() => {
          suppressPointerOpenRef.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') suppressPointerOpenRef.current = false;
        }}
      >
        {icon}
      </Popover.Trigger>
      <Popover.Content
        className="ui-overlay-surface w-72 p-2"
        placement="right top"
        onMouseEnter={cancelScheduledClose}
        onMouseLeave={scheduleClose}
      >
        <Popover.Arrow className="fill-surface-raised stroke-border" />
        <Popover.Dialog aria-label={label}>
          <div
            ref={dialogContentRef}
            tabIndex={-1}
            onKeyDownCapture={(event) => {
              if (event.key === 'Escape') restoreFocusRef.current = true;
            }}
          >
            {children}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
