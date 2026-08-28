import { CircleUserRound, LogOut, Palette } from "lucide-react";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";
import type { PrincipalView } from "@webui/sdk/runtime";
import { translateMessage } from "../../i18n";

// AccountMenu 迁到 RAC MenuTrigger+Popover+Menu（069）：dismiss/焦点/Escape 由 react-aria
// 承担；触发按钮与 menuitem 语义保持（e2e role 断言不变）。
export function AccountMenu({ principal, onRequestLogout, onOpenTheme }: { principal?: PrincipalView; onRequestLogout: () => void; onOpenTheme?: () => void }) {
  return (
    <MenuTrigger>
      <Button className="account-menu-trigger" aria-label={principal?.username ?? translateMessage("webui.host.account")}>
        <span className="user-avatar">{principal?.username.slice(0, 1).toUpperCase() ?? <CircleUserRound size={18} />}</span><span>{principal?.username ?? translateMessage("webui.host.account")}</span>
      </Button>
      <Popover className="rac-menu-popover">
        <Menu aria-label={translateMessage("webui.host.account")} onAction={(key) => { if (key === "appearance") onOpenTheme?.(); if (key === "logout") onRequestLogout(); }} className="rac-menu">
          {onOpenTheme && <MenuItem id="appearance" className="rac-menu-item"><Palette size={16} />{translateMessage("webui.host.theme")}</MenuItem>}
          <MenuItem id="logout" className="rac-menu-item" isDisabled={!principal}><LogOut size={16} />{translateMessage("webui.host.logout")}</MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
