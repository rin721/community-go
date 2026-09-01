import { Popover } from '@heroui/react/popover';
import { useEffect, useRef, type ReactNode } from 'react';

const navigationFlyoutCloseDelayMs = 140;
// Compact Navigation 属于非模态子菜单；Pointer 打开时保持当前焦点，键盘打开时仍进入 Overlay。
const navigationFlyoutTrigger = 'SubmenuTrigger';

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
  const openRef = useRef(isOpen);
  const ignoreNextPressCloseRef = useRef(false);
  const pointerOverTriggerRef = useRef(false);
  const pointerOverContentRef = useRef(false);

  useEffect(() => {
    openRef.current = isOpen;
  }, [isOpen]);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  };
  const requestOpenChange = (open: boolean) => {
    if (openRef.current === open) return;
    openRef.current = open;
    onOpenChange(open);
  };
  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = undefined;
      if (!pointerOverTriggerRef.current && !pointerOverContentRef.current) {
        requestOpenChange(false);
      }
    }, navigationFlyoutCloseDelayMs);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      cancelScheduledClose();
    }
    if (!open && ignoreNextPressCloseRef.current) {
      ignoreNextPressCloseRef.current = false;
      return;
    }
    requestOpenChange(open);
  };

  useEffect(() => () => cancelScheduledClose(), []);

  return (
    <Popover isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger<'button'>
        aria-label={label}
        className={`flex h-11 w-full items-center justify-center rounded-control transition-colors ${active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}
        title={label}
        render={(triggerProps) => <button {...triggerProps} type="button" />}
        onPointerEnter={() => {
          pointerOverTriggerRef.current = true;
          cancelScheduledClose();
          requestOpenChange(true);
        }}
        onPointerLeave={() => {
          pointerOverTriggerRef.current = false;
          scheduleClose();
        }}
        onPointerDown={() => {
          ignoreNextPressCloseRef.current = openRef.current;
        }}
      >
        {icon}
      </Popover.Trigger>
      <Popover.Content
        aria-label={label}
        className="ui-overlay-surface w-72 p-2"
        isNonModal
        placement="right top"
        trigger={navigationFlyoutTrigger}
        onPointerEnter={() => {
          pointerOverContentRef.current = true;
          cancelScheduledClose();
        }}
        onPointerLeave={() => {
          pointerOverContentRef.current = false;
          scheduleClose();
        }}
      >
        <Popover.Arrow className="fill-surface-raised stroke-border" />
        {children}
      </Popover.Content>
    </Popover>
  );
}
