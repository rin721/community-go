import { PageHeader, PageSection } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { SettingsNavLayout, currentSettingsSection } from "./SettingsNavLayout";
import styles from "./settings.module.css";

// AboutPage presents the project introduction, tech stack and repository
// (static bilingual content, 072).
export default function AboutPage() {
  const { t } = useWebUITranslation("webui.settings");
  return <div className={`${styles.settingsModule} module-page`}>
    <SettingsNavLayout active={currentSettingsSection(window.location.pathname)}>
      <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.about.title")} description={t("webui.settings.about.description")} />
      <div className="page-sections">
        <PageSection kicker={t("webui.settings.about.intro.kicker")} title={t("webui.settings.about.intro.title")}>
          <p className="page-description">{t("webui.settings.about.intro.body")}</p>
        </PageSection>
        <PageSection kicker={t("webui.settings.about.stack.kicker")} title={t("webui.settings.about.stack.title")}>
          <ul className="settings-stack">{["Go", "React 19", "Vite", "TypeScript", "HeroUI v3", "Tailwind CSS v4"].map((item) => <li className="page-meta" key={item}>{item}</li>)}</ul>
        </PageSection>
        <PageSection kicker={t("webui.settings.about.repository.kicker")} title={t("webui.settings.about.repository.title")}>
          <p className="page-description">{t("webui.settings.about.repository.body")}</p>
        </PageSection>
      </div>
    </SettingsNavLayout>
  </div>;
}