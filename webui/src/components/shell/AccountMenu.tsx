import { CircleUserRound, Expand, LogOut, Palette } from "lucide-react";
import type { PrincipalView } from "@webui/sdk/runtime";
import { ActionMenu } from "@webui/sdk/ui";
import { translateMessage } from "../../i18n";

// AccountMenu 迁到 RAC MenuTrigger+Popover+Menu（069）：dismiss/焦点/Escape 由 react-aria
// 承担；触发按钮与 menuitem 语义保持（e2e role 断言不变）。
export function AccountMenu({ principal, onRequestLogout, onOpenTheme, onToggleFullscreen }: { principal?: PrincipalView; onRequestLogout: () => void; onOpenTheme?: () => void; onToggleFullscreen?: () => void }) {
  const items = [
    ...(onOpenTheme ? [{ id: "appearance", label: <><Palette size={16} />{translateMessage("webui.host.theme")}</> }] : []),
    ...(onToggleFullscreen ? [{ id: "fullscreen", label: <><Expand size={16} />{translateMessage("webui.host.fullscreen")}</> }] : []),
    { id: "logout", label: <><LogOut size={16} />{translateMessage("webui.host.logout")}</>, disabled: !principal },
  ];
  return <ActionMenu label={principal?.username ?? translateMessage("webui.host.account")} triggerClassName="account-menu-trigger" trigger={<><span className="user-avatar">{principal?.username.slice(0, 1).toUpperCase() ?? <CircleUserRound size={18} />}</span><span>{principal?.username ?? translateMessage("webui.host.account")}</span></>} items={items} onAction={(key) => { if (key === "appearance") onOpenTheme?.(); if (key === "fullscreen") onToggleFullscreen?.(); if (key === "logout") onRequestLogout(); }} />;
}
