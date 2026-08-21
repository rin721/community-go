import { useState } from "react";
import { Button, Field, Surface } from "@webui/sdk/ui";
import { useHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { login, principalFromSession } from "./api";
import styles from "./iam.module.css";
export default function LoginPage() { const { t } = useWebUITranslation("webui.iam"); const { completeAuthentication } = useHostRuntime(); const [username,setUsername]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); return <Surface className={`${styles.iamModule} auth-panel`}><div className="auth-heading"><p className="page-eyebrow">{t("webui.iam.brand")}</p><h1>{t("webui.iam.login.title")}</h1><p>{t("webui.iam.login.description")}</p></div><form className="iam-form" onSubmit={(event)=>{event.preventDefault();setError("");login(username,password).then((value)=>completeAuthentication(principalFromSession(value))).catch(()=>setError(t("webui.iam.error")));}}><Field label={t("webui.iam.username")} required value={username} onChange={(event)=>setUsername(event.target.value)}/><Field label={t("webui.iam.password")} type="password" required value={password} onChange={(event)=>setPassword(event.target.value)}/>{error&&<p className="form-error">{error}</p>}<Button type="submit">{t("webui.iam.login.submit")}</Button></form></Surface>; }
