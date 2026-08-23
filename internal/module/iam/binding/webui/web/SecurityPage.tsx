import { useEffect, useState } from "react";
import { Button, Field, PageHeader, PageSection, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { changePassword, loadSession, type IAMSession } from "./api";
import styles from "./iam.module.css";

export default function SecurityPage() {
  const { t } = useWebUITranslation("webui.iam");
  const [session, setSession] = useState<IAMSession>();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { void loadSession().then(setSession); }, []);
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.security.title")} description={t("webui.iam.security.description")} actions={session && <StatusPill state={session.identity.mustChangePassword ? "degraded" : "available"}>{session.identity.mustChangePassword ? t("webui.iam.security.changeRequired") : t("webui.iam.security.secure")}</StatusPill>} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.security.panel.kicker")} title={t("webui.iam.security.panel.title")}>
        <form className="form-panel" onSubmit={(event) => { event.preventDefault(); changePassword(current, next).then(() => setMessage(t("webui.iam.security.changed"))).catch(() => setMessage(t("webui.iam.error"))); }}>
          <Field label={t("webui.iam.security.current")} type="password" required value={current} onChange={(event) => setCurrent(event.target.value)} />
          <Field label={t("webui.iam.security.next")} type="password" minLength={15} required value={next} onChange={(event) => setNext(event.target.value)} />
          {message && <p className="page-meta">{message}</p>}
          <div className="toolbar-actions"><Button type="submit">{t("webui.iam.security.submit")}</Button></div>
        </form>
      </PageSection>
    </div>
  </div>;
}