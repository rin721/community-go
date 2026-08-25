import { useState } from "react";
import { Button, DataTable, Field, InlineAlert, Surface, type DataTableColumn } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { readWebUIDataSource } from "@webui/sdk/runtime";
import { loadSessionSnapshot } from "./api";
import { MethodBadge } from "./MethodBadge";
import {
  buildRequest, executionParameters, hasSecurityScheme, isMutation, requestBodySchema, responseRows, sampleJSON,
  type ExecutionParameterRow, type OperationRow, type ResponseRow, type SchemaObject,
} from "./openapi-data";
import styles from "./openapi.module.css";

const EXECUTION_TIMEOUT_MS = 20_000;

type Translate = (key: string, options?: Record<string, unknown>) => string;

type RunState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "done"; result: RunResult }
  | { kind: "error"; message: string };

type RunResult = {
  ok: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
};

// prettyBody pretty-prints JSON bodies; non-JSON text is shown verbatim.
function prettyBody(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function responseColumns(t: Translate): ReadonlyArray<DataTableColumn<ResponseRow>> {
  return [
    { id: "status", header: t("webui.openapi.table.status"), cell: (row) => <code className={styles.monoCell}>{row.status}</code> },
    { id: "description", header: t("webui.openapi.table.description"), cell: (row) => row.description },
    { id: "schema", header: t("webui.openapi.table.schema"), cell: (row) => <code className={styles.monoCell}>{row.schema}</code> },
  ];
}

export function ResponsePanel({ result }: { result: RunResult }) {
  const { t } = useWebUITranslation("webui.openapi");
  const headerLines = Object.entries(result.headers).map(([name, value]) => `${name}: ${value}`).join("\n");
  return <section className={styles.responsePanel} data-testid="openapi-response">
    <div className={styles.responseMeta}>
      <span className={result.ok ? styles.responseOk : styles.responseError}>{result.status} {result.statusText}</span>
      <span className={styles.responseDuration}>{t("webui.openapi.response.duration", { ms: result.durationMs })}</span>
    </div>
    {headerLines !== "" && <details className={styles.responseHeaders}><summary>{t("webui.openapi.response.headers")}</summary><pre className={styles.monoBlock}>{headerLines}</pre></details>}
    <pre className={styles.responseBody}>{prettyBody(result.body)}</pre>
  </section>;
}

// OperationDetail wraps the selected operation: editable parameters, a JSON
// request body editor, the bearer token input and the execute panel
// (R075-004). Execution is same-origin fetch with session semantics; in mock
// demo builds execution is disabled with an explicit notice.
export function OperationDetail({ row, schemas }: { row: OperationRow; schemas: Record<string, SchemaObject> | undefined }) {
  const { t } = useWebUITranslation("webui.openapi");
  const [parameters, setParameters] = useState<ExecutionParameterRow[]>(() => executionParameters(row));
  const bodySchema = requestBodySchema(row);
  const [bodyText, setBodyText] = useState(() => {
    const sample = sampleJSON(bodySchema?.schema, schemas);
    return sample === null || sample === undefined ? "" : JSON.stringify(sample, null, 2);
  });
  const [bearerToken, setBearerToken] = useState("");
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });
  const executable = readWebUIDataSource() !== "mock";

  const updateParameter = (name: string, value: string) =>
    setParameters((current) => current.map((parameter) => (parameter.name === name ? { ...parameter, value } : parameter)));

  const execute = async () => {
    if (bodyText.trim() !== "" && bodySchema) {
      try {
        JSON.parse(bodyText);
      } catch {
        setRunState({ kind: "error", message: t("webui.openapi.run.invalidJson") });
        return;
      }
    }
    setRunState({ kind: "pending" });
    try {
      let csrfToken: string | undefined;
      if (hasSecurityScheme(row, "webuiSession") && isMutation(row.method)) {
        // The session snapshot carries the current CSRF token (like the real
        // WebUI); a stale session fails here and the error is surfaced.
        const session = await loadSessionSnapshot();
        csrfToken = session.csrfToken;
      }
      const pathValues = Object.fromEntries(parameters.filter((parameter) => parameter.location === "path").map((parameter) => [parameter.name, parameter.value]));
      const queryValues = Object.fromEntries(parameters.filter((parameter) => parameter.location === "query").map((parameter) => [parameter.name, parameter.value]));
      const built = buildRequest(row, {
        pathValues, queryValues, bodyText,
        bearerToken, csrfToken, origin: window.location.origin,
      });
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);
      const started = performance.now();
      let response: Response;
      try {
        response = await fetch(built.url, {
          method: built.method,
          headers: built.headers,
          body: built.body,
          credentials: "include",
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timer);
      }
      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => { headers[name] = value; });
      setRunState({
        kind: "done",
        result: {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          durationMs: Math.round(performance.now() - started),
          headers,
          body,
        },
      });
    } catch (error) {
      setRunState({ kind: "error", message: error instanceof Error ? error.message : "request_failed" });
    }
  };

  return <Surface className={styles.detailCard} data-testid="openapi-operation">
    <div className={styles.detailHeader}>
      <MethodBadge method={row.method} />
      <code className={styles.operationPath}>{row.path}</code>
      <h2 className={styles.detailTitle}>{row.operationId}</h2>
    </div>
    {row.summary && <p className={styles.operationSummary}>{row.summary}</p>}
    {row.description && <p className={styles.operationSummary}>{row.description}</p>}
    <div className={styles.detailSections}>
      {parameters.length > 0 && <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>{t("webui.openapi.detail.params")}</h3>
        <div className={styles.parameterFields}>
          {parameters.map((parameter) => (
            <Field
              key={parameter.name}
              className={styles.parameterField}
              label={`${parameter.name} · ${parameter.location}${parameter.required ? ` · ${t("webui.openapi.table.required")}` : ""}`}
              value={parameter.value}
              onChange={(event) => updateParameter(parameter.name, event.target.value)}
              hint={parameter.type}
            />
          ))}
        </div>
      </section>}
      {bodySchema && <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>{t("webui.openapi.detail.body")}{bodySchema.required ? ` · ${t("webui.openapi.table.required")}` : ""}</h3>
        <textarea
          aria-label={t("webui.openapi.detail.body")}
          className={styles.bodyEditor}
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
          rows={10}
          spellCheck={false}
        />
      </section>}
      {hasSecurityScheme(row, "bearerAuth") && <section className={styles.detailSection}>
        <Field
          label={t("webui.openapi.auth.bearer")}
          type="password"
          value={bearerToken}
          onChange={(event) => setBearerToken(event.target.value)}
          placeholder={t("webui.openapi.auth.bearerPlaceholder")}
        />
      </section>}
      {hasSecurityScheme(row, "webuiSession") && <p className={styles.sessionNote}>{t("webui.openapi.auth.session")}</p>}
      <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>{t("webui.openapi.detail.responses")}</h3>
        <DataTable columns={responseColumns(t)} rows={responseRows(row)} ariaLabel={t("webui.openapi.detail.responses")} getRowKey={(item) => item.status} />
      </section>
    </div>
    <div className={styles.runBar}>
      {executable
        ? <Button className={styles.runButton} onClick={() => void execute()} disabled={runState.kind === "pending"}>
            {t(runState.kind === "pending" ? "webui.openapi.run.running" : "webui.openapi.run.execute")}
          </Button>
        : <InlineAlert tone="info" title={t("webui.openapi.run.mockDisabled")} />}
    </div>
    {runState.kind === "error" && <InlineAlert tone="danger" title={t("webui.openapi.run.error")} detail={runState.message} />}
    {runState.kind === "done" && <ResponsePanel result={runState.result} />}
  </Surface>;
}