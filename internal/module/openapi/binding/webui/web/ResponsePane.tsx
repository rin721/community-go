import { useState } from "react";
import { Button, Disclosure, InlineAlert, Spinner, StatusBadge } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { highlightJSON } from "./highlight";
import { formatBytes, type RunState } from "./run-store";
import styles from "./openapi.module.css";

// ResponsePane is the lower response area of the openapi workspace (R075-009):
// an idle placeholder until a request is sent, then status chip + duration +
// size and the pretty-printed / highlighted JSON body with response headers.
export function ResponsePane({ state }: { state: RunState }) {
  const { t } = useWebUITranslation("webui.openapi");
  const [view, setView] = useState<"json" | "raw">("json");

  if (state.kind === "idle") {
    return <section className={styles.responsePane} data-testid="openapi-response"><p className={styles.responseIdle}>{t("webui.openapi.response.empty")}</p></section>;
  }
  if (state.kind === "pending") {
    return <section className={styles.responsePane} data-testid="openapi-response"><div className={styles.responsePending}><Spinner size="sm" label={t("webui.openapi.run.running")} /><span>{t("webui.openapi.run.running")}</span></div></section>;
  }
  if (state.kind === "error") {
    return <section className={styles.responsePane} data-testid="openapi-response"><InlineAlert tone="danger" title={t("webui.openapi.run.error")} detail={state.message} /></section>;
  }

  const result = state.result;
  const statusClass = result.status < 300 ? styles.statusOk : result.status < 400 ? styles.statusWarn : styles.statusError;
  const headerLines = Object.entries(result.headers).map(([name, value]) => `${name}: ${value}`).join("\n");
  return <section className={styles.responsePane} data-testid="openapi-response">
    <div className={styles.responseMeta}>
      <StatusBadge status={result.status < 300 ? "healthy" : result.status < 400 ? "degraded" : "failed"} className={statusClass}>{result.status} {result.statusText}</StatusBadge>
      <span className={styles.responseStat}>{t("webui.openapi.response.duration", { ms: result.durationMs })}</span>
      <span className={styles.responseStat}>{formatBytes(result.sizeBytes)}</span>
      {result.bodyClass === "json" && view === "json"
        ? <Button variant="ghost" onClick={() => setView("raw")}>{t("webui.openapi.response.view.raw")}</Button>
        : result.bodyClass === "json"
          ? <Button variant="ghost" onClick={() => setView("json")}>{t("webui.openapi.response.view.json")}</Button>
          : null}
    </div>
    <pre className={styles.responseBody} data-testid="openapi-response-body">
      {result.bodyClass === "json" && view === "json"
        ? <code dangerouslySetInnerHTML={{ __html: highlightJSON(result.body) }} />
        : result.body}
    </pre>
    {headerLines !== "" && <Disclosure className={styles.responseHeaders} label={t("webui.openapi.response.headers")}><pre className={styles.monoBlock}>{headerLines}</pre></Disclosure>}
  </section>;
}
