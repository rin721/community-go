import { Ban, CircleOff, FileQuestion, LogIn, PlugZap, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, StatusPill } from "@webui/ui";
import { translateMessage } from "../i18n";

type StateKind = "forbidden" | "notFound" | "notImplemented" | "unauthorized" | "missingEntry";
const states = {
  forbidden: { code: "403", icon: Ban, title: "webui.host.forbidden.title", detail: "webui.host.forbidden.detail", capability: "unavailable" as const },
  notFound: { code: "404", icon: FileQuestion, title: "webui.host.notFound.title", detail: "webui.host.notFound.detail", capability: "unavailable" as const },
  notImplemented: { code: "NI", icon: CircleOff, title: "webui.host.notImplemented.title", detail: "webui.host.notImplemented.detail", capability: "not-implemented" as const },
  unauthorized: { code: "401", icon: LogIn, title: "webui.host.unauthorized.title", detail: "webui.host.unauthorized.detail", capability: "unavailable" as const },
  missingEntry: { code: "REG", icon: PlugZap, title: "webui.host.route.missing.title", detail: "webui.host.route.missing.detail", capability: "unavailable" as const },
};

export function SystemStatePage({ kind, detail }: { kind: StateKind; detail?: string }) {
  const navigate = useNavigate();
  const state = states[kind];
  const Icon = state.icon;
  return <section className="system-state"><div className="state-illustration"><span>{state.code}</span><Icon size={54} /></div><StatusPill state={state.capability}>{translateMessage(`webui.host.status.${state.capability}`)}</StatusPill><h1>{translateMessage(state.title)}</h1><p>{detail ?? translateMessage(state.detail)}</p><Button variant="secondary" onClick={() => navigate("/")}><Undo2 size={16} />{translateMessage("webui.host.backHome")}</Button></section>;
}
