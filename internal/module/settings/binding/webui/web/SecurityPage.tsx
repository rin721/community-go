import { useCallback, useEffect, useState } from "react";
import { Button, Field, formatDateTime, InlineAlert, PageHeader, PageSection, StatusPill, StickyActionBar } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { beginMFAEnroll, changePassword, confirmMFAEnroll, disableMFA, listApiTokens, loadSession, mfaStatus } from "./api";
import styles from "./settings.module.css";

// SecurityPage provides password/authentication settings: the password change
// form (072), MFA/TOTP enrollment, and an API-Token entry summary (080) whose
// full management lives on the dedicated /admin/api-tokens page.
export default function SecurityPage() {
  const { t } = useWebUITranslation("webui.settings");
  const [mustChange, setMustChange] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");


  const [mfaRegistered, setMfaRegistered] = useState<boolean | null>(null);
  const [mfaEnroll, setMfaEnroll] = useState<{ secret: string; uri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRecovery, setMfaRecovery] = useState<string[] | null>(null);
  const [mfaMessage, setMfaMessage] = useState("");
  const [mfaPending, setMfaPending] = useState(false);



  const [tokenCount, setTokenCount] = useState(0);
  const [tokenLastUsed, setTokenLastUsed] = useState("");

  const refreshTokenSummary = useCallback(() => {
    void listApiTokens().then((value) => { setTokenCount(value.total); setTokenLastUsed(value.items[0]?.lastUsedAt ?? ""); }).catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadSession().then((value) => setMustChange(value.identity.mustChangePassword)).catch(() => undefined);
    void mfaStatus().then((value) => setMfaRegistered(value.registered)).catch(() => setMfaRegistered(false));
    void refreshTokenSummary();
  }, [refreshTokenSummary]);

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm;
  const canSubmit = current.length > 0 && next.length >= 15 && confirm.length > 0 && !mismatch;
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setMessage("");
    changePassword(current, next).then(() => { setMessage(t("webui.settings.security.changed")); setCurrent(""); setNext(""); setConfirm(""); }).catch(() => setMessage(t("webui.settings.error")));
  };

  const enableMFA = () => {
    setMfaPending(true);
    setMfaMessage("");
    beginMFAEnroll().then((value) => { setMfaEnroll(value); setMfaRecovery(null); }).catch(() => setMfaMessage(t("webui.settings.error"))).finally(() => setMfaPending(false));
  };
  const confirmMFA = () => {
    setMfaPending(true);
    setMfaMessage("");
    confirmMFAEnroll(mfaCode).then((value) => { setMfaEnroll(null); setMfaRecovery(value.recoveryCodes); setMfaRegistered(true); setMfaCode(""); }).catch(() => setMfaMessage(t("webui.settings.error"))).finally(() => setMfaPending(false));
  };
  const stopMFA = () => {
    setMfaPending(true);
    setMfaMessage("");
    disableMFA(mfaCode).then(() => { setMfaRegistered(false); setMfaRecovery(null); setMfaCode(""); }).catch(() => setMfaMessage(t("webui.settings.error"))).finally(() => setMfaPending(false));
  };

  const createToken = () => {

    window.location.href = "/admin/api-tokens";
  };

  return <>
    <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.security.title")} description={t("webui.settings.security.description")} actions={mustChange && <StatusPill state="degraded">{t("webui.settings.security.changeRequired")}</StatusPill>} />
    <div className="page-sections">
      <PageSection kicker={t("webui.settings.security.kicker")} title={t("webui.settings.security.passwordTitle")}>
        <form className="form-panel form-panel-bounded" onSubmit={submit}>
          <Field label={t("webui.settings.security.current")} type="password" required value={current} onChange={(event) => setCurrent(event.target.value)} />
          <Field label={t("webui.settings.security.next")} type="password" minLength={15} required value={next} onChange={(event) => setNext(event.target.value)} hint={t("webui.settings.security.helper")} />
          <Field label={t("webui.settings.security.confirm")} type="password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} error={mismatch ? t("webui.settings.security.confirmMismatch") : undefined} />
          {message && <p className="page-meta" role="status">{message}</p>}
          <StickyActionBar><Button type="submit" disabled={!canSubmit}>{t("webui.settings.security.submit")}</Button></StickyActionBar>
        </form>
      </PageSection>

      <PageSection kicker={t("webui.settings.security.mfaKicker")} title={t("webui.settings.security.mfaTitle")}>
        {mfaRegistered ? <InlineAlert tone="success" title={t("webui.settings.security.mfaRegistered")} /> : <InlineAlert tone="info" title={t("webui.settings.security.mfaNotRegistered")} />}
        {!mfaRegistered && !mfaEnroll && <div className="toolbar-actions"><Button onClick={enableMFA} disabled={mfaPending}>{t("webui.settings.security.mfaEnable")}</Button></div>}
        {mfaEnroll && (
          <div className="form-panel">
            <p className="page-meta">{t("webui.settings.security.mfaUri")}</p>
            <code className="page-monospace">{mfaEnroll.uri}</code>
            <Field label={t("webui.settings.security.mfaCode")} inputMode="numeric" maxLength={6} required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} />
            <div className="toolbar-actions"><Button onClick={confirmMFA} disabled={mfaPending || mfaCode.length < 6}>{t("webui.settings.security.mfaConfirm")}</Button></div>
          </div>
        )}
        {mfaRecovery && (
          <div className="form-panel">
            <p className="page-meta">{t("webui.settings.security.mfaRecovery")}</p>
            <ul className="page-stack">{mfaRecovery.map((code) => <li key={code}><code>{code}</code></li>)}</ul>
          </div>
        )}
        {mfaRegistered && (
          <div className="form-panel">
            <Field label={t("webui.settings.security.mfaCode")} inputMode="numeric" maxLength={6} required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} />
            <div className="toolbar-actions"><Button variant="danger" onClick={stopMFA} disabled={mfaPending || mfaCode.length < 6}>{t("webui.settings.security.mfaDisable")}</Button></div>
          </div>
        )}
        {mfaMessage && <p className="page-meta" role="status">{mfaMessage}</p>}
      </PageSection>

      <PageSection kicker={t("webui.settings.security.tokensKicker")} title={t("webui.settings.security.tokensTitle")}>
        <p className="page-meta">{t("webui.settings.security.tokenSummary")}: {tokenCount}</p>
        {tokenLastUsed && <p className="page-meta">{t("webui.settings.security.tokenLastUsed")}: {formatDateTime(tokenLastUsed)}</p>}
        <div className="toolbar-actions"><Button onClick={createToken}>{t("webui.settings.security.tokensManage")}</Button></div>
      </PageSection>
    </div>
  </>;
}
