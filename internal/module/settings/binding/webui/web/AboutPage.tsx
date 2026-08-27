import { PageHeader, PageSection } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import styles from "./settings.module.css";

// AboutPage presents the project introduction, tech stack and repository
// (static bilingual content, 072).
export default function AboutPage() {
  const { t } = useWebUITranslation("webui.settings");
  return <div className={`${styles.settingsModule} module-page`}>
    
      <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.about.title")} description={t("webui.settings.about.description")} />
      <div className="page-sections">
        <PageSection kicker={t("webui.settings.about.intro.kicker")} title={t("webui.settings.about.intro.title")}>
          <p className="page-description">{t("webui.settings.about.intro.body")}</p>
        </PageSection>
        <PageSection kicker={t("webui.settings.about.stack.kicker")} title={t("webui.settings.about.stack.title")}>
          <ul className="stack-grid">{[["Go", "go"], ["React 19", "react"], ["Vite", "vite"], ["TypeScript", "ts"], ["HeroUI v3", "heroui"], ["Tailwind CSS v4", "tw"]].map(([label, code]) => <li className="stack-chip" key={code}><code>{code}</code><span>{label}</span></li>)}</ul>
        </PageSection>
        <PageSection kicker={t("webui.settings.about.repository.kicker")} title={t("webui.settings.about.repository.title")}>
          <p className="page-description">{t("webui.settings.about.repository.body")}</p>
          <p className="page-description"><a href="https://github.com/rin721/community-go" target="_blank" rel="noreferrer" className="about-repo-link">{t("webui.settings.about.repository.link")}</a></p>
        </PageSection>
      </div>
    
  </div>;
}