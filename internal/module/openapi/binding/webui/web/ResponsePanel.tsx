import { useState } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import { InlineAlert } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { highlightJSON } from "./highlight";
import { formatBytes, type RunState } from "./run-store";
import styles from "./openapi.module.css";

// ResponsePanel is the right-side response pane of the debug workspace
// (R075-005): status chip with class colouring, duration and size, a JSON
// highlighted / raw body view and the response headers. Bodies are untrusted
// text and are rendered via text nodes or escaped HTML (highlight.ts).
export function ResponsePanel({ state }: { state: RunState }) {
  const { t } = useWebUITranslation("webui.openapi");
  const [view, setView] = useState<"json" | "raw">("json");
  if (state.kind === "idle") {
    return <section className={styles.responsePanel} data-testid="openapi-response">
      <p className={styles.responseIdle}>{t("webui.openapi.response.empty")}</p>
    </section>;
  }
  if (state.kind === "pending") {
    return <section className={styles.responsePanel} data-testid="openapi-response">
      <div className={styles.responsePending}><Spinner size="sm" /><span>{t("webui.openapi.run.running")}</span></div>
    </section>;
  }
  if (state.kind === "error") {
    return <section className={styles.responsePanel} data-testid="openapi-response">
      <InlineAlert tone="danger" title={t("webui.openapi.run.error")} detail={state.message} />
    </section>;
  }
  const result = state.result;
  const statusClass = result.status < 300 ? styles.statusOk : result.status < 400 ? styles.statusWarn : styles.statusError;
  const headerLines = Object.entries(result.headers).map(([name, value]) => `${name}: ${value}`).join("\n");
  const bodyHtml = view === "json" && result.bodyClass === "json" ? highlightJSON(result.body) : null;
  return <section className={styles.responsePanel} data-testid="openapi-response">
    <div className={styles.responseToolbar}>
      <Chip className={statusClass} size="sm">{result.status} {result.statusText}</Chip>
      <span className={styles.responseStat}>{t("webui.openapi.response.duration", { ms: result.durationMs })}</span>
      <span className={styles.responseStat}>{formatBytes(result.sizeBytes)}</span>
      <span className={styles.responseSpacer} />
      {result.bodyClass === "json" && (
        <div className={styles.responseViewToggle}>
          <Button size="sm" variant={view === "json" ? "primary" : "ghost"} onPress={() => setView("json")}>{t("webui.openapi.response.view.json")}</Button>
          <Button size="sm" variant={view === "raw" ? "primary" : "ghost"} onPress={() => setView("raw")}>{t("webui.openapi.response.view.raw")}</Button>
        </div>
      )}
    </div>
    <div className={styles.responseBodyWrap}>
      {bodyHtml !== null
        ? <pre className={styles.responseBody} data-testid="openapi-response-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        : <pre className={styles.responseBody} data-testid="openapi-response-body">{result.body}</pre>}
    </div>
    {headerLines !== "" && <details className={styles.responseHeaders}>
      <summary>{t("webui.openapi.response.headers")}</summary>
      <pre className={styles.monoBlock}>{headerLines}</pre>
    </details>}
  </section>;
}