import { useEffect, useState } from "react";
import { PageHeader, PageSection, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { loadSession } from "./api";
import styles from "./settings.module.css";

// ProfilePage shows a read-only identity and account summary from the IAM session.
export default function ProfilePage() {
  const { t } = useWebUITranslation("webui.settings");
  const [session, setSession] = useState<Awaited<ReturnType<typeof loadSession>>>();
  useEffect(() => { void loadSession().then(setSession).catch(() => undefined); }, []);
  const identity = session?.identity;
  return <div className={`${styles.settingsModule} module-page`}>
    <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.profile.title")} description={t("webui.settings.profile.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.settings.profile.identity.kicker")} title={t("webui.settings.profile.identity.title")}>
        {identity && <dl className="settings-summary"><div><dt>{t("webui.settings.profile.displayName")}</dt><dd>{identity.displayName}</dd></div><div><dt>{t("webui.settings.profile.username")}</dt><dd>@{identity.username}</dd></div><div><dt>{t("webui.settings.profile.securityRevision")}</dt><dd>rev {identity.securityRevision}</dd></div><div><dt>{t("webui.settings.profile.status")}</dt><dd><StatusPill state={identity.mustChangePassword ? "degraded" : "available"}>{identity.mustChangePassword ? t("webui.settings.profile.changeRequired") : t("webui.settings.profile.secure")}</StatusPill></dd></div></dl>}
      </PageSection>
    </div>
  </div>;
}