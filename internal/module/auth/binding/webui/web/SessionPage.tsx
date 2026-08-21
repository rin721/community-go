import { useEffect, useState } from "react";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { CapabilityBanner, EmptyState, PageHeader, StatusPill, Surface } from "@webui/sdk/ui";
import { loadSession, type WebUISession } from "./api";
import "./auth.module.css";

export function sessionCapabilityState(hasSession: boolean): "available" | "unavailable" {
  return hasSession ? "available" : "unavailable";
}

export default function SessionPage() {
  const { t } = useWebUITranslation("webui.auth");
  const [session, setSession] = useState<WebUISession>();
  useEffect(() => { let active = true; void loadSession().then((value) => { if (active) setSession(value); }).catch(() => undefined); return () => { active = false; }; }, []);
  const scopeCount = session?.user.scopes.length ?? 0;
  const state = sessionCapabilityState(Boolean(session));
  return <div className="module-page"><PageHeader eyebrow={t("webui.auth.session.eyebrow")} title={t("webui.auth.session.title")} description={t("webui.auth.session.description")} actions={session && <StatusPill state={state}>{t("webui.auth.session.active")}</StatusPill>} /><CapabilityBanner state={state} statusLabel={t(`webui.auth.session.${state}`)} title={session ? t("webui.auth.session.status.title") : t("webui.auth.session.unauthenticated.title")} detail={session ? t("webui.auth.session.status.detail") : t("webui.auth.session.unauthenticated.detail")} />{session ? <><div className="auth-summary-grid"><Surface className="auth-summary-card"><small>{t("webui.auth.session.summary.identity")}</small><strong>{session.user.username}</strong><span>{t("webui.auth.session.summary.identityDetail")}</span></Surface><Surface className="auth-summary-card"><small>{t("webui.auth.session.summary.scopes")}</small><strong>{scopeCount}</strong><span>{t("webui.auth.session.summary.scopesDetail")}</span></Surface><Surface className="auth-summary-card"><small>{t("webui.auth.session.summary.created")}</small><strong>{session.createdAt}</strong><span>{t("webui.auth.session.summary.createdDetail")}</span></Surface></div><div className="auth-session-grid"><Surface><header className="section-heading"><div><h2>{t("webui.auth.session.lifecycle.title")}</h2><p>{t("webui.auth.session.lifecycle.detail")}</p></div></header><dl className="detail-list"><dt>{t("webui.auth.session.id")}</dt><dd>{session.user.id}</dd><dt>{t("webui.auth.session.createdAt")}</dt><dd>{session.createdAt}</dd><dt>{t("webui.auth.session.idleExpiresAt")}</dt><dd>{session.idleExpiresAt}</dd><dt>{t("webui.auth.session.absoluteExpiresAt")}</dt><dd>{session.absoluteExpiresAt}</dd></dl></Surface><Surface><header className="section-heading"><div><h2>{t("webui.auth.session.scopes")}</h2><p>{t("webui.auth.session.scopesDetail")}</p></div></header>{scopeCount > 0 ? <ul className="scope-list">{session.user.scopes.map((scope) => <li className="scope-item" key={scope}><span className="scope-dot" aria-hidden="true" /><code>{scope}</code></li>)}</ul> : <EmptyState title={t("webui.auth.session.noScopes")} detail={t("webui.auth.session.noScopesDetail")} />}</Surface></div></> : <Surface><EmptyState title={t("webui.auth.session.unauthenticated.title")} detail={t("webui.auth.session.unauthenticated")} /></Surface>}</div>;
}
