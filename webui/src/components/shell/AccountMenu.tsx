import { CircleUserRound, LogOut } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { PrincipalView } from "@webui/sdk/runtime";
import { translateMessage } from "../../i18n";

// AccountMenu 是账号 popover：触发按钮 + 退出入口，复用统一 dismiss/focus 模型
// （Escape、click-outside、focus return），关闭态不进入键盘路径。
export function AccountMenu({ principal, onRequestLogout }: { principal?: PrincipalView; onRequestLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("[data-menu-initial-focus]")?.focus());
    return () => {
      cancelAnimationFrame(focusFrame);
      const target = restoreFocusRef.current ?? triggerRef.current;
      restoreFocusRef.current = null;
      target?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab" && event.shiftKey && document.activeElement === panelRef.current?.querySelector("[data-menu-initial-focus]")) {
      event.preventDefault();
      triggerRef.current?.focus();
    }
  };

  return <div className="account-menu">
    <button ref={triggerRef} type="button" className="account-menu-trigger" onClick={() => setOpen((current) => !current)} aria-haspopup="menu" aria-expanded={open} aria-label={principal?.username ?? translateMessage("webui.host.account")}>
      <span className="user-avatar">{principal?.username.slice(0, 1).toUpperCase() ?? <CircleUserRound size={18} />}</span><span>{principal?.username ?? translateMessage("webui.host.account")}</span>
    </button>
    {open && <div ref={panelRef} className="account-menu-popover" role="menu" aria-label={translateMessage("webui.host.account")} onKeyDown={handlePanelKeyDown}>
      <button type="button" data-menu-initial-focus role="menuitem" onClick={() => { setOpen(false); onRequestLogout(); }} disabled={!principal}><LogOut size={16} />{translateMessage("webui.host.logout")}</button>
    </div>}
  </div>;
}