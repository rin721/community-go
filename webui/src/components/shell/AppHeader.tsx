import { ChevronRight, Expand, Languages, Menu, Moon, PanelLeftClose, PanelLeftOpen, Palette, Search, Sun } from "lucide-react";
import type { RefObject } from "react";
import type { ManifestRoute, PrincipalView } from "@webui/sdk/runtime";
import { Button, IconButton } from "@webui/sdk/ui";
import type { ThemePreferences } from "../../theme";
import { languageLabelMessageID, translateMessage } from "../../i18n";
import { ZoneItems } from "../../zone/ZoneItems";
import { AccountMenu } from "./AccountMenu";
import { MockBadge } from "./MockBadge";

// AppHeader 拥有 topbar 的视觉与操作拆分：左侧 trigger/breadcrumb，右侧工具与账号。
export function AppHeader({ collapsed, onToggleSidebar, mobileMenuButtonRef, onOpenMobileMenu, showBreadcrumb, currentRoute, pathname, hostLanguage, availableLanguages, onLanguageChange, theme, onToggleColorScheme, onOpenTheme, onOpenSearch, onToggleFullscreen, principal, onRequestLogout }: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  mobileMenuButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenMobileMenu: () => void;
  showBreadcrumb: boolean;
  currentRoute?: ManifestRoute;
  pathname: string;
  hostLanguage: string;
  availableLanguages: string[];
  onLanguageChange: (language: string) => void;
  theme: ThemePreferences;
  onToggleColorScheme: () => void;
  onOpenTheme: () => void;
  onOpenSearch: () => void;
  onToggleFullscreen: () => void;
  principal?: PrincipalView;
  onRequestLogout: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <IconButton label={translateMessage(collapsed ? "webui.host.sidebar.expand" : "webui.host.sidebar.collapse")} onClick={onToggleSidebar} className="desktop-sidebar-toggle">
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </IconButton>
        <IconButton label={translateMessage("webui.host.menu.open")} onClick={onOpenMobileMenu} className="mobile-menu-button" buttonRef={mobileMenuButtonRef}><Menu size={20} /></IconButton>
        {showBreadcrumb && <div className="breadcrumb"><span>{translateMessage("webui.host.breadcrumb.home")}</span><ChevronRight size={14} /><strong>{currentRoute ? translateMessage(currentRoute.titleMessageId) : pathname}</strong></div>}
      </div>
      <div className="topbar-actions">
        <MockBadge />
        <ZoneItems zone="header-actions" />
        <Button type="button" variant="secondary" className="search-trigger" onClick={onOpenSearch}><Search size={17} /><span>{translateMessage("webui.host.search")}</span><kbd>{translateMessage("webui.host.search.shortcut")}</kbd></Button>
        <IconButton label={translateMessage("webui.host.fullscreen")} title={translateMessage("webui.host.fullscreen")} onClick={() => void onToggleFullscreen()}><Expand size={18} /></IconButton>
        <label className="language-button" title={translateMessage("webui.host.language")}><Languages size={18} /><select aria-label={translateMessage("webui.host.language")} value={hostLanguage} onChange={(event) => onLanguageChange(event.target.value)}>{availableLanguages.map((language) => <option value={language} key={language}>{translateMessage(languageLabelMessageID(language))}</option>)}</select></label>
        <IconButton label={translateMessage("webui.host.theme.toggle")} title={translateMessage("webui.host.theme.toggle")} onClick={onToggleColorScheme}>{theme.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}</IconButton>
        <IconButton label={translateMessage("webui.host.theme")} title={translateMessage("webui.host.theme")} onClick={onOpenTheme}><Palette size={18} /></IconButton>
        <AccountMenu principal={principal} onRequestLogout={onRequestLogout} onOpenTheme={onOpenTheme} />
      </div>
    </header>
  );
}
