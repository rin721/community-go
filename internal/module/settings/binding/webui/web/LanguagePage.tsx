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
  // Same language resolution as the host i18n: without an explicit local choice,
  // fall back to the browser language (zh-CN/en-US) so the radio group always
  // has a single selected entry (084 fix).
  const current = localStorage.getItem("community-go-webui-language") ?? (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en") ? "en-US" : "zh-CN");
  const choose = (value: string) => {
    localStorage.setItem("community-go-webui-language", value);
    window.location.reload();
  };
  return <div className={`${styles.settingsModule} module-page`}>
    <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.language.title")} description={t("webui.settings.language.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.settings.language.kicker")} title={t("webui.settings.language.interfaceTitle")}>
        <div className="setting-options" role="radiogroup" aria-label={t("webui.settings.language.interfaceTitle")}>
          {languageOptions.map((option) => {
            const selected = option.value === current;
            return <button type="button" key={option.value} role="radio" aria-checked={selected} className="setting-option" onClick={() => choose(option.value)}><span className="setting-option-radio" aria-hidden="true" /><span>{t(option.label)}</span></button>;
          })}
        </div>
        <p className="page-meta">{t("webui.settings.language.reloadNote")}</p>
      </PageSection>
    </div>
  </div>;
}