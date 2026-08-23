import { SectionNav, type SectionNavItem } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import type { ReactNode } from "react";

// SettingsNavLayout is the settings in-page section navigation layout (071,
// second menu-hierarchy shape): a SectionNav on the left
// (Profile/Account/Appearance/Notifications with deep-link hrefs) and the
// content area on the right. It coexists with the global menu tree
// (host.center -> settings.center -> four sub pages). Section navigation uses
// the href semantics of SectionNav (browser default navigation when onSelect
// is omitted).
const sectionRoutes = ["profile", "account", "appearance", "notifications"] as const;
export type SettingsSection = (typeof sectionRoutes)[number];

export function sectionItemID(section: SettingsSection): string {
  return `settings.${section}`;
}

// settingsNavItems builds the section items (labels from i18n, deep-link hrefs).
export function settingsNavItems(t: (key: string) => string): ReadonlyArray<SectionNavItem> {
  return sectionRoutes.map((section) => ({
    id: sectionItemID(section),
    label: t(`webui.settings.${section}.title`),
    href: `/settings/${section}`,
  }));
}

export function SettingsNavLayout({ active, children }: { active: SettingsSection; children: ReactNode }) {
  const { t } = useWebUITranslation("webui.settings");
  const items = settingsNavItems(t);
  return <div className="settings-inner" data-settings-active={active}>
    <SectionNav ariaLabel={t("webui.settings.brand")} items={items} activeId={sectionItemID(active)} />
    <div className="settings-content">{children}</div>
  </div>;
}

// currentSettingsSection infers the active section from the path (/settings/xxx).
export function currentSettingsSection(pathname: string): SettingsSection {
  const match = /^\/settings\/(profile|account|appearance|notifications)/.exec(pathname);
  const section = match?.[1] as SettingsSection | undefined;
  return section ?? "profile";
}