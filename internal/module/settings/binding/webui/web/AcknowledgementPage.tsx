import { PageHeader, PageSection } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { SettingsNavLayout, currentSettingsSection } from "./SettingsNavLayout";
import styles from "./settings.module.css";

// AcknowledgementPage presents credits and acknowledgements (static bilingual
// content, 072).
export default function AcknowledgementPage() {
  const { t } = useWebUITranslation("webui.settings");
  return <div className={`${styles.settingsModule} module-page`}>
    <SettingsNavLayout active={currentSettingsSection(window.location.pathname)}>
      <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.acknowledgement.title")} description={t("webui.settings.acknowledgement.description")} />
      <div className="page-sections">
        <PageSection kicker={t("webui.settings.acknowledgement.framework.kicker")} title={t("webui.settings.acknowledgement.framework.title")}>
          <p className="page-description">{t("webui.settings.acknowledgement.framework.body")}</p>
        </PageSection>
        <PageSection kicker={t("webui.settings.acknowledgement.deps.kicker")} title={t("webui.settings.acknowledgement.deps.title")}>
          <p className="page-description">{t("webui.settings.acknowledgement.deps.body")}</p>
        </PageSection>
        <PageSection kicker={t("webui.settings.acknowledgement.contributors.kicker")} title={t("webui.settings.acknowledgement.contributors.title")}>
          <p className="page-description">{t("webui.settings.acknowledgement.contributors.body")}</p>
        </PageSection>
      </div>
    </SettingsNavLayout>
  </div>;
}