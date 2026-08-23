import { useEffect, useState } from "react";
import { Button, Field, PageHeader, PageSection, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { changePassword, loadSession } from "./api";
import styles from "./settings.module.css";

// SecurityPage provides password/authentication settings: the password change
// form (migrated from the former Account page, 072) plus a security summary.
export default function SecurityPage() {
  const { t } = useWebUITranslation("webui.settings");
  const [mustChange, setMustChange] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { void loadSession().then((value) => setMustChange(value.identity.mustChangePassword)).catch(() => undefined); }, []);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    changePassword(current, next).then(() => { setMessage(t("webui.settings.security.changed")); setCurrent(""); setNext(""); }).catch(() => setMessage(t("webui.settings.error")));
  };
  return <div className={`${styles.settingsModule} module-page`}>
    
      <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.security.title")} description={t("webui.settings.security.description")} actions={mustChange && <StatusPill state="degraded">{t("webui.settings.security.changeRequired")}</StatusPill>} />
      <div className="page-sections">
        <PageSection kicker={t("webui.settings.security.kicker")} title={t("webui.settings.security.passwordTitle")}>
          <form className="form-panel" onSubmit={submit}>
            <Field label={t("webui.settings.security.current")} type="password" required value={current} onChange={(event) => setCurrent(event.target.value)} />
            <Field label={t("webui.settings.security.next")} type="password" minLength={15} required value={next} onChange={(event) => setNext(event.target.value)} />
            {message && <p className="page-meta" role="status">{message}</p>}
            <div className="toolbar-actions"><Button type="submit">{t("webui.settings.security.submit")}</Button></div>
          </form>
        </PageSection>
      </div>
    
  </div>;
}