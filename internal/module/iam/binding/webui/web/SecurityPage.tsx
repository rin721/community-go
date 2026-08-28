import { useEffect, useState } from "react";
import { Button, Field, PageFrame, PageHeader, PageSection, StatusPill, StickyActionBar } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { changePassword, loadSession, type IAMSession } from "./api";
import styles from "./iam.module.css";

export default function SecurityPage() {
  const { t } = useWebUITranslation("webui.iam");
  const [session, setSession] = useState<IAMSession>();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { void loadSession().then(setSession); }, []);
  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm;
  const canSubmit = current.length > 0 && next.length >= 15 && confirm.length > 0 && !mismatch;
  return <PageFrame variant="form" className={styles.iamModule}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.security.title")} description={t("webui.iam.security.description")} actions={session && <StatusPill state={session.identity.mustChangePassword ? "degraded" : "available"}>{session.identity.mustChangePassword ? t("webui.iam.security.changeRequired") : t("webui.iam.security.secure")}</StatusPill>} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.security.panel.kicker")} title={t("webui.iam.security.panel.title")}>
        <div className="security-layout">
          <form className="form-panel form-panel-bounded" onSubmit={(event) => { event.preventDefault(); if (!canSubmit) return; changePassword(current, next).then(() => { setMessage(t("webui.iam.security.changed")); setCurrent(""); setNext(""); setConfirm(""); }).catch(() => setMessage(t("webui.iam.error"))); }}>
            <Field label={t("webui.iam.security.current")} type="password" required value={current} onChange={(event) => setCurrent(event.target.value)} />
            <Field label={t("webui.iam.security.next")} type="password" minLength={15} required value={next} onChange={(event) => setNext(event.target.value)} hint={t("webui.iam.security.helper")} />
            <Field label={t("webui.iam.security.confirm")} type="password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} error={mismatch ? t("webui.iam.security.confirmMismatch") : undefined} />
            {message && <p className="page-meta" role="status">{message}</p>}
            <StickyActionBar><Button type="submit" disabled={!canSubmit}>{t("webui.iam.security.submit")}</Button></StickyActionBar>
          </form>
          <aside className="security-aside">
            <h4>{t("webui.iam.security.requirements")}</h4>
            <p className="page-meta">{t("webui.iam.security.helper")}</p>
            {session?.identity.mustChangePassword && <p className="page-meta">{t("webui.iam.security.changeRequired")}</p>}
          </aside>
        </div>
      </PageSection>
    </div>
  </PageFrame>;
}
