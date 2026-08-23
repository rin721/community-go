import { useEffect, useState } from "react";
import { Button, Field, PageHeader, PageSection, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { changePassword, loadSession } from "./api";
import styles from "./settings.module.css";

// AccountPage provides account and security settings: password change via the
// IAM self capability plus a security state summary.
export default function AccountPage() {
  const { t } = useWebUITranslation("webui.settings");
  const [mustChange, setMustChange] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { void loadSession().then((value) => setMustChange(value.identity.mustChangePassword)).catch(() => undefined); }, []);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    changePassword(current, next).then(() => { setMessage(t("webui.settings.account.changed")); setCurrent(""); setNext(""); }).catch(() => setMessage(t("webui.settings.error")));
  };
  return <div className={`${styles.settingsModule} module-page`}>
    <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.account.title")} description={t("webui.settings.account.description")} actions={mustChange && <StatusPill state="degraded">{t("webui.settings.account.changeRequired")}</StatusPill>} />
    <div className="page-sections">
      <PageSection kicker={t("webui.settings.account.password.kicker")} title={t("webui.settings.account.password.title")}>
        <form className="form-panel" onSubmit={submit}>
          <Field label={t("webui.settings.account.current")} type="password" required value={current} onChange={(event) => setCurrent(event.target.value)} />
          <Field label={t("webui.settings.account.next")} type="password" minLength={15} required value={next} onChange={(event) => setNext(event.target.value)} />
          {message && <p className="page-meta" role="status">{message}</p>}
          <div className="toolbar-actions"><Button type="submit">{t("webui.settings.account.submit")}</Button></div>
        </form>
      </PageSection>
    </div>
  </div>;
}