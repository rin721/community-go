import { useState } from "react";
import { Button, Field, Surface } from "@webui/sdk/ui";
import { useHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { principalFromSession, setup } from "./api";
import styles from "./auth.module.css";

const setupErrorMessageIDs: Readonly<Record<string, string>> = {
  cors_origin_denied: "webui.auth.setup.errors.corsOriginDenied",
  internal_server_error: "webui.auth.setup.errors.internalServerError",
  invalid_credentials: "webui.auth.setup.errors.invalidCredentials",
  invalid_request: "webui.auth.setup.errors.invalidRequest",
  origin_rejected: "webui.auth.setup.errors.originRejected",
  password_length_invalid: "webui.auth.setup.errors.passwordLengthInvalid",
  setup_closed: "webui.auth.setup.errors.setupClosed",
  username_invalid: "webui.auth.setup.errors.usernameInvalid",
};

export function setupErrorMessageID(reason: unknown): string {
  if (!(reason instanceof Error)) return "webui.auth.setup.errors.unknown";
  return setupErrorMessageIDs[reason.message] ?? "webui.auth.setup.errors.unknown";
}

export default function SetupPage() {
  const { t } = useWebUITranslation("webui.auth");
  const { completeAuthentication } = useHostRuntime();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return <Surface className={`${styles.authModule} auth-panel`}><div className="auth-panel-heading"><span className="auth-symbol">{t("webui.auth.brandSymbol")}</span><p className="page-eyebrow">{t("webui.auth.brand")}</p><h1>{t("webui.auth.setup.title")}</h1><p>{t("webui.auth.setup.description")}</p></div><form className="auth-form" onSubmit={(event) => { event.preventDefault(); setError(""); setup(token, username, password).then((session) => completeAuthentication(principalFromSession(session))).catch((reason: unknown) => setError(t(setupErrorMessageID(reason)))); }}><Field label={t("webui.auth.setup.token")} type="password" autoComplete="off" spellCheck={false} required value={token} onChange={(event) => setToken(event.target.value)} /><Field label={t("webui.auth.setup.username")} required maxLength={128} value={username} onChange={(event) => setUsername(event.target.value)} /><Field label={t("webui.auth.setup.password")} type="password" required minLength={15} maxLength={128} hint={t("webui.auth.setup.passwordHint")} value={password} onChange={(event) => setPassword(event.target.value)} />{error && <p className="form-error">{error}</p>}<Button type="submit">{t("webui.auth.setup.submit")}</Button></form></Surface>;
}
