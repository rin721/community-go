import { Popover } from '@heroui/react/popover';
import { useEffect, useRef, useState, type ReactNode } from 'react';

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
  // 父级（Compact Shell 的 openBranchId）直接关闭时不会经过 requestOpenChange，internalClose 保持 false；
  // 此时跳过 Popover 退出动画，避免旧菜单退出层与新菜单进入层短暂叠加。
  const [internalClose, setInternalClose] = useState(false);
  // 渲染后同步的 isOpen 快照：延迟关闭回调在计时器触发时读取最新值，
  // 避免闭包捕获旧 isOpen 导致父级已关闭后仍向上冒泡误关新菜单。
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    openRef.current = isOpen;
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const skipExitAnimation = !isOpen && !internalClose;

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  };
  const requestOpenChange = (open: boolean) => {
    if (openRef.current === open) return;
    // 父级已通过 isOpen prop 关闭（兄弟切换或叶子导航）后，延迟关闭回调不能再向上冒泡，
    // 否则会把新打开的兄弟菜单误关。
    if (!open && !isOpenRef.current) return;
    openRef.current = open;
    // 只有真正由本 Flyout 内部发起的关闭（指针离开计时器、RAC 用户关闭）才播放退出动画；
    // 父级直接替换 openBranchId 的关闭保持 internalClose=false，跳过退出动画。
    setInternalClose(!open);
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
    // RAC 在父级已通过 isOpen prop 关闭后也会回调 onOpenChange(false)；
    // 此时关闭由父级发起，不再向上冒泡，避免旧菜单的回调误关新打开的兄弟菜单。
    if (!open && !isOpenRef.current) return;
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
        shouldSkipAnimation={skipExitAnimation}
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
