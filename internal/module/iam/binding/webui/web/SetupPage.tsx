import { useState } from "react";
import { Button, Field, InlineAlert, Surface } from "@webui/sdk/ui";
import { useHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { principalFromSession, setup } from "./api";
import styles from "./iam.module.css";

// SetupPage initializes the system with a one-time Setup Token and creates the
// first owner account. Fields are grouped into "init credentials" and "owner
// account" sections; new password needs a confirmation field.
export default function SetupPage() {
  const { t } = useWebUITranslation("webui.iam");
  const { completeAuthentication } = useHostRuntime();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const mismatch = password.length > 0 && confirm.length > 0 && password !== confirm;
  const canSubmit = token.trim().length > 0 && username.trim().length > 0 && name.trim().length > 0 && password.length >= 15 && confirm.length > 0 && !mismatch;
  return <Surface className={`${styles.iamModule} auth-panel`}>
    <div className="auth-heading">
      <p className="page-eyebrow">{t("webui.iam.brand")}</p>
      <h1>{t("webui.iam.setup.title")}</h1>
      <p>{t("webui.iam.setup.description")}</p>
    </div>
    <form className="iam-form" onSubmit={(event) => { event.preventDefault(); setError(""); if (!canSubmit) return; setup(token, username, name, password).then((value) => completeAuthentication(principalFromSession(value))).catch(() => setError(t("webui.iam.error"))); }}>
      <div className="auth-section">
        <h2 className="auth-section-title">{t("webui.iam.setup.credentials.title")}</h2>
        <p className="auth-section-hint">{t("webui.iam.setup.credentials.hint")}</p>
        <Field label={t("webui.iam.setup.token")} type="password" required autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} />
      </div>
      <div className="auth-section">
        <h2 className="auth-section-title">{t("webui.iam.setup.owner.title")}</h2>
        <div className="field-grid">
          <Field label={t("webui.iam.username")} required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
          <Field label={t("webui.iam.displayName")} required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="auth-password-wrap">
          <Field label={t("webui.iam.password")} type={showPassword ? "text" : "password"} minLength={15} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} hint={t("webui.iam.security.helper")} />
          <Button type="button" variant="secondary" className="auth-toggle" onClick={() => setShowPassword((current) => !current)}>{t(showPassword ? "webui.iam.login.hidePassword" : "webui.iam.login.showPassword")}</Button>
        </div>
        <Field label={t("webui.iam.security.confirm")} type={showPassword ? "text" : "password"} required value={confirm} onChange={(event) => setConfirm(event.target.value)} error={mismatch ? t("webui.iam.security.confirmMismatch") : undefined} />
      </div>
      {error && <InlineAlert tone="danger" title={error} />}
      <Button type="submit" disabled={!canSubmit}>{t("webui.iam.setup.submit")}</Button>
    </form>
  </Surface>;
}