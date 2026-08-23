import { PageHeader, PageSection } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import styles from "./settings.module.css";

// LanguagePage lets the user choose the interface language. It writes the host
// language key (community-go-webui-language, same as the topbar selector) and
// reloads; the host i18n remains the single language authority.
const languageOptions: Array<{ value: string; label: string }> = [
  { value: "zh-CN", label: "webui.settings.language.zhCN" },
  { value: "en-US", label: "webui.settings.language.enUS" },
];

export default function LanguagePage() {
  const { t } = useWebUITranslation("webui.settings");
  const choose = (value: string) => {
    localStorage.setItem("community-go-webui-language", value);
    window.location.reload();
  };
  return <div className={`${styles.settingsModule} module-page`}>
    
      <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.language.title")} description={t("webui.settings.language.description")} />
      <div className="page-sections">
        <PageSection kicker={t("webui.settings.language.kicker")} title={t("webui.settings.language.interfaceTitle")}>
          <div className="settings-stack">
            {languageOptions.map((option) => <button type="button" key={option.value} className={`section-nav-item ${option.value === (localStorage.getItem("community-go-webui-language") ?? "") ? "active" : ""}`} onClick={() => choose(option.value)}><span>{t(option.label)}</span></button>)}
          </div>
          <p className="page-meta">{t("webui.settings.language.reloadNote")}</p>
        </PageSection>
      </div>
    
  </div>;
}