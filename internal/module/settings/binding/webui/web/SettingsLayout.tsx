import { SectionNav, type SectionNavItem } from "@webui/sdk/ui";
import { useOptionalHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import type { ReactNode } from "react";
import styles from "./settings.module.css";

// SettingsLayout is the settings group layout entry (073): the in-page section
// navigation is mounted once by the host group route and stays fixed while the
// content area (children, supplied by the host <Outlet />) switches between the
// eight sections. The layout component has no router dependency; section
// switches go through the host runtime navigate callback (SPA).
const sectionRoutes = ["profile", "account", "security", "appearance", "notifications", "language", "about", "acknowledgement"] as const;
export type SettingsSection = (typeof sectionRoutes)[number];

export function sectionItemID(section: SettingsSection): string {
  return `settings.${section}`;
}

export function settingsNavItems(t: (key: string) => string): ReadonlyArray<SectionNavItem> {
  return sectionRoutes.map((section) => ({
    id: sectionItemID(section),
    label: t(`webui.settings.${section}.title`),
    href: `/settings/${section}`,
  }));
}

// currentSettingsSection infers the active section from the path (/settings/xxx).
export function currentSettingsSection(pathname: string): SettingsSection {
  const match = /^\/settings\/(profile|account|security|appearance|notifications|language|about|acknowledgement)/.exec(pathname);
  const section = match?.[1] as SettingsSection | undefined;
  return section ?? "profile";
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const { t } = useWebUITranslation("webui.settings");
  const runtime = useOptionalHostRuntime();
  const navigate = runtime?.navigate;
  const active = currentSettingsSection(window.location.pathname);
  const items = settingsNavItems(t);
  // The module scope class must sit on an ancestor element while .settings-inner
  // stays a descendant: the css-module rule is "<hash> .settings-inner", so the
  // two classes cannot live on the same node (self is not its own descendant).
  return <div className={`${styles.settingsModule} module-page`} data-page-width="settings">
    <div className="settings-inner" data-settings-active={active}>
      <SectionNav ariaLabel={t("webui.settings.brand")} items={items} activeId={sectionItemID(active)} onSelect={navigate ? (id) => { const section = sectionRoutes.find((candidate) => sectionItemID(candidate) === id); if (section) navigate(`/settings/${section}`); } : undefined} />
      <div className="settings-content">{children}</div>
    </div>
  </div>;
}