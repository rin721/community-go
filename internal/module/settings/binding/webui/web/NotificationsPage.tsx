import { useEffect, useState } from "react";
import { PageHeader, PageSection, Switch } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import styles from "./settings.module.css";

// NotificationsPage exposes notification preferences. There is no backend
// notification service yet, so preferences are persisted only in localStorage
// and the page states that boundary explicitly (recorded as a future direction).
type Prefs = { emailDigest: boolean; inApp: boolean; showSummaries: boolean; dailySummary: boolean };

const storageKey = "community-go-webui-notification-prefs";
const defaults: Prefs = { emailDigest: true, inApp: true, showSummaries: true, dailySummary: false };

function readPrefs(): Prefs {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return value && typeof value === "object" ? { ...defaults, ...(value as Partial<Prefs>) } : defaults;
  } catch {
    return defaults;
  }
}

export default function NotificationsPage() {
  const { t } = useWebUITranslation("webui.settings");
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  useEffect(() => { setPrefs(readPrefs()); }, []);
  const update = (patch: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };
  return <div className={`${styles.settingsModule} module-page`}>
    <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.notifications.title")} description={t("webui.settings.notifications.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.settings.notifications.prefs.kicker")} title={t("webui.settings.notifications.prefs.title")}>
        <div className="settings-stack">
          <div className="setting-row"><div className="setting-row-label"><span className="setting-row-title">{t("webui.settings.notifications.emailDigest")}</span></div><div className="setting-row-control"><Switch ariaLabel={t("webui.settings.notifications.emailDigest")} checked={prefs.emailDigest} onChange={(emailDigest) => update({ emailDigest })} /></div></div>
          <div className="setting-row"><div className="setting-row-label"><span className="setting-row-title">{t("webui.settings.notifications.inApp")}</span></div><div className="setting-row-control"><Switch ariaLabel={t("webui.settings.notifications.inApp")} checked={prefs.inApp} onChange={(inApp) => update({ inApp })} /></div></div>
          <div className="setting-row"><div className="setting-row-label"><span className="setting-row-title">{t("webui.settings.notifications.showSummaries")}</span></div><div className="setting-row-control"><Switch ariaLabel={t("webui.settings.notifications.showSummaries")} checked={prefs.showSummaries} onChange={(showSummaries) => update({ showSummaries })} /></div></div>
          <div className="setting-row"><div className="setting-row-label"><span className="setting-row-title">{t("webui.settings.notifications.dailySummary")}</span></div><div className="setting-row-control"><Switch ariaLabel={t("webui.settings.notifications.dailySummary")} checked={prefs.dailySummary} onChange={(dailySummary) => update({ dailySummary })} /></div></div>
        </div>
        <p className="page-meta">{t("webui.settings.notifications.localOnly")}</p>
      </PageSection>
    </div>
  </div>;
}