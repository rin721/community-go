import { Ban, CircleOff, FileQuestion, LogIn, PlugZap, TriangleAlert, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";

type StateKind = "forbidden" | "notFound" | "notImplemented" | "unauthorized" | "unavailable" | "missingEntry" | "routeError";
const states = {
  forbidden: { code: "403", icon: Ban, title: "webui.host.forbidden.title", detail: "webui.host.forbidden.detail", capability: "unavailable" as const },
  notFound: { code: "404", icon: FileQuestion, title: "webui.host.notFound.title", detail: "webui.host.notFound.detail", capability: "unavailable" as const },
  notImplemented: { code: "NI", icon: CircleOff, title: "webui.host.notImplemented.title", detail: "webui.host.notImplemented.detail", capability: "not-implemented" as const },
  unauthorized: { code: "401", icon: LogIn, title: "webui.host.unauthorized.title", detail: "webui.host.unauthorized.detail", capability: "unavailable" as const },
  unavailable: { code: "503", icon: PlugZap, title: "webui.host.unavailable.title", detail: "webui.host.unavailable.detail", capability: "unavailable" as const },
  missingEntry: { code: "REG", icon: PlugZap, title: "webui.host.route.missing.title", detail: "webui.host.route.missing.detail", capability: "unavailable" as const },
  routeError: { code: "ERR", icon: TriangleAlert, title: "webui.host.route.error.title", detail: "webui.host.route.error.detail", capability: "unavailable" as const },
};

export function SystemStatePage({ kind, detail }: { kind: StateKind; detail?: string }) {
  const { t } = useWebUITranslation("webui.host");
  const navigate = useNavigate();
  const state = states[kind];
  const Icon = state.icon;
  return <section className={`system-state system-state-${kind}`}><div className="state-illustration" aria-hidden="true"><span className="state-number">{state.code}</span><span className="state-card"><Icon size={58} strokeWidth={1.5} /></span><span className="state-shadow" /></div><StatusPill state={state.capability}>{t(`webui.host.status.${state.capability}`)}</StatusPill><h1>{t(state.title)}</h1><p>{detail ?? t(state.detail)}</p><Button onClick={() => navigate("/")}><Undo2 size={16} />{t("webui.host.backHome")}</Button></section>;
}
