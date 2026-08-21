import { useState } from "react";
import { Button, Field, Surface } from "@webui/sdk/ui";
import { useHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { login, principalFromSession } from "./api";
import "./auth.module.css";

const loginErrorMessageIDs: Readonly<Record<string, string>> = {
  invalid_credentials: "webui.auth.login.errors.invalidCredentials",
  invalid_request: "webui.auth.login.errors.invalidRequest",
};

export function loginErrorMessageID(reason: unknown): string {
  if (!(reason instanceof Error)) return "webui.auth.login.errors.unknown";
  return loginErrorMessageIDs[reason.message] ?? "webui.auth.login.errors.unknown";
}

export default function LoginPage() {
  const { t } = useWebUITranslation("webui.auth");
  const { completeAuthentication } = useHostRuntime();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return <Surface className="auth-panel"><div className="auth-panel-heading"><span className="auth-symbol">{t("webui.auth.brandSymbol")}</span><p className="page-eyebrow">{t("webui.auth.brand")}</p><h1>{t("webui.auth.login.title")}</h1><p>{t("webui.auth.login.description")}</p></div><form className="auth-form" onSubmit={(event) => { event.preventDefault(); setError(""); setPending(true); login(username, password).then((session) => completeAuthentication(principalFromSession(session))).catch((reason: unknown) => setError(t(loginErrorMessageID(reason)))).finally(() => setPending(false)); }}><Field label={t("webui.auth.login.username")} required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /><Field label={t("webui.auth.login.password")} required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />{error && <p className="form-error">{error}</p>}<Button type="submit" disabled={pending}>{pending ? t("webui.auth.login.pending") : t("webui.auth.login.submit")}</Button></form></Surface>;
}
