import { SectionNav, type SectionNavItem } from "@webui/sdk/ui";
import { useOptionalHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import type { ReactNode } from "react";

// SettingsNavLayout is the settings in-page section navigation layout (071,
// second menu-hierarchy shape): a SectionNav on the left
// (Profile/Account/Security/Appearance/Notifications/Language/About/Acknowledgement)
// and the content area on the right. It coexists with the global menu tree
// (host.center -> settings.center). Section switching performs a SPA route
// change through the host runtime navigate callback (072), replacing the
// 071 full-page default-navigation path.
const sectionRoutes = ["profile", "account", "security", "appearance", "notifications", "language", "about", "acknowledgement"] as const;
export type SettingsSection = (typeof sectionRoutes)[number];

export function sectionItemID(section: SettingsSection): string {
  return `settings.${section}`;
}

// settingsNavItems builds the section items (labels from i18n, deep-link hrefs
// kept as fallback semantics when the host navigate callback is unavailable).
export function settingsNavItems(t: (key: string) => string): ReadonlyArray<SectionNavItem> {
  return sectionRoutes.map((section) => ({
    id: sectionItemID(section),
    label: t(`webui.settings.${section}.title`),
    href: `/settings/${section}`,
  }));
}

export function SettingsNavLayout({ active, children }: { active: SettingsSection; children: ReactNode }) {
  const { t } = useWebUITranslation("webui.settings");
  const runtime = useOptionalHostRuntime();
  const navigate = runtime?.navigate;
  const items = settingsNavItems(t);
  return <div className="settings-inner" data-settings-active={active}>
    <SectionNav ariaLabel={t("webui.settings.brand")} items={items} activeId={sectionItemID(active)} onSelect={navigate ? (id) => { const section = sectionRoutes.find((candidate) => sectionItemID(candidate) === id); if (section) navigate(`/settings/${section}`); } : undefined} />
    <div className="settings-content">{children}</div>
  </div>;
}

// currentSettingsSection infers the active section from the path (/settings/xxx).
export function currentSettingsSection(pathname: string): SettingsSection {
  const match = /^\/settings\/(profile|account|security|appearance|notifications|language|about|acknowledgement)/.exec(pathname);
  const section = match?.[1] as SettingsSection | undefined;
  return section ?? "profile";
}