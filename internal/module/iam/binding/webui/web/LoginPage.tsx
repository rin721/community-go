import { useState } from "react";
import { Button, Field, InlineAlert, Surface } from "@webui/sdk/ui";
import { useHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { login, principalFromSession } from "./api";
import styles from "./iam.module.css";

// LoginPage is the centered auth surface for the blank layout: brand heading,
// username + password (with reveal toggle), explicit error alert and a hint
// guiding first-time users to the Setup page.
export default function LoginPage() {
  const { t } = useWebUITranslation("webui.iam");
  const { completeAuthentication } = useHostRuntime();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  return <Surface className={`${styles.iamModule} auth-panel`}>
    <div className="auth-heading">
      <p className="page-eyebrow">{t("webui.iam.brand")}</p>
      <h1>{t("webui.iam.login.title")}</h1>
      <p>{t("webui.iam.login.description")}</p>
    </div>
    <form className="iam-form" onSubmit={(event) => { event.preventDefault(); setError(""); login(username, password).then((value) => completeAuthentication(principalFromSession(value))).catch(() => setError(t("webui.iam.error"))); }}>
      <Field label={t("webui.iam.username")} required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
      <div className="auth-password-wrap">
        <Field label={t("webui.iam.password")} type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Button type="button" variant="secondary" className="auth-toggle" onClick={() => setShowPassword((current) => !current)}>{t(showPassword ? "webui.iam.login.hidePassword" : "webui.iam.login.showPassword")}</Button>
      </div>
      {error && <InlineAlert tone="danger" title={error} />}
      <Button type="submit">{t("webui.iam.login.submit")}</Button>
    </form>
    <div className="auth-footnote"><span>{t("webui.iam.login.hint")}</span></div>
  </Surface>;
}