import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { readWebUIDataSource } from "@webui/sdk/runtime";
import { InlineAlert } from "@webui/sdk/ui";
import { loadSessionSnapshot } from "./api";
import { RequestPane, type HeaderRow, type ParamEditorRow } from "./RequestPane";
import { ResponsePane } from "./ResponsePane";
import { Resizer } from "./Resizer";
import {
  bodyTypeOptions, buildRequest, executionParameters, formFieldRows, hasSecurityScheme, isMutation,
  requestBodySchema, sampleJSON,
  type BodyType, type FormFieldRow, type OperationRow, type SchemaObject,
} from "./openapi-data";
import { assembleRunResult, type RunState } from "./run-store";
import styles from "./openapi.module.css";

const EXECUTION_TIMEOUT_MS = 20_000;
const INITIAL_RATIO = 0.5;

// OperationWorkspace owns the editor + execution state for one open operation
// (keyed by row id so switching tabs keeps each tab's editors and run state):
// the request pane (URL + send + Params/Body/Headers/Cookies/Auth), the
// draggable splitter and the response pane. Execution reuses the established
// same-origin semantics (bearer in-memory token, webuiSession Cookie+CSRF,
// mock disabled).
export function OperationWorkspace({ row, schemas }: { row: OperationRow; schemas: Record<string, SchemaObject> | undefined }) {
  const { t } = useWebUITranslation("webui.openapi");
  const params = useMemo(
    () => executionParameters(row).map((p) => ({ name: p.name, value: p.value, kind: "text" as const, required: p.required, description: "", location: p.location })),
    [row],
  );
  const [paramRows, setParamRows] = useState<ParamEditorRow[]>(params);
  useEffect(() => setParamRows(params.map((p) => ({ ...p }))), [params]);

  const bodySchema = requestBodySchema(row);
  const bodyTypes = useMemo(() => bodyTypeOptions(row), [row]);
  const [bodyType, setBodyType] = useState<BodyType>(bodyTypes[0] ?? "json");
  const [bodyText, setBodyText] = useState(() => {
    const sample = sampleJSON(bodySchema?.schema, schemas);
    return sample === null || sample === undefined ? "" : JSON.stringify(sample, null, 2);
  });
  const [formRows, setFormRows] = useState<FormFieldRow[]>(() => formFieldRows(bodySchema?.schema));
  const [files, setFiles] = useState<Record<string, File>>({});
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>([{ name: "", value: "" }]);
  const [cookieRows, setCookieRows] = useState<HeaderRow[]>([]);
  const [bearerToken, setBearerToken] = useState("");
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });
  const [ratio, setRatio] = useState(INITIAL_RATIO);
  const executable = readWebUIDataSource() !== "mock";

  const updateParam = (index: number, patch: Partial<ParamEditorRow>) => setParamRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const execute = async () => {
    if (bodyText.trim() !== "" && bodyType === "json" && bodySchema) {
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
        const session = await loadSessionSnapshot();
        csrfToken = session.csrfToken;
      }
      const pathValues = Object.fromEntries(paramRows.filter((p) => p.location === "path").map((p) => [p.name, p.value]));
      const queryValues = Object.fromEntries(paramRows.filter((p) => p.location === "query").map((p) => [p.name, p.value]));
      const extraHeaders = Object.fromEntries(headerRows.filter((h) => h.name.trim() !== "").map((h) => [h.name.trim(), h.value]));
      const cookies = Object.fromEntries(cookieRows.filter((c) => c.name.trim() !== "").map((c) => [c.name.trim(), c.value]));
      if (Object.keys(cookies).length > 0) extraHeaders["Cookie"] = Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ");
      const built = buildRequest(row, {
        pathValues, queryValues,
        bodyText, bodyType,
        formEntries: [],
        extraHeaders, bearerToken, csrfToken, origin: window.location.origin,
      });
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);
      const started = performance.now();
      let response: Response;
      try {
        const init: RequestInit = { method: built.method, headers: built.headers, credentials: "include", signal: controller.signal };
        if (bodyType === "form") {
          const formData = new FormData();
          for (const field of formRows) {
            if (field.kind === "file") {
              const file = files[field.name];
              if (file) formData.append(field.name, file);
            } else if (field.value !== "") {
              formData.append(field.name, field.value);
            }
          }
          init.body = formData;
        } else if (built.body) {
          init.body = built.body;
        }
        response = await fetch(built.url, init);
      } finally {
        window.clearTimeout(timer);
      }
      const durationMs = Math.round(performance.now() - started);
      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => { headers[name] = value; });
      setRunState({ kind: "done", result: assembleRunResult({ ok: response.ok, status: response.status, statusText: response.statusText, durationMs, headers, body }) });
    } catch (error) {
      setRunState({ kind: "error", message: error instanceof Error ? error.message : "request_failed" });
    }
  };

  const url = useMemo(() => {
    let value = row.path;
    for (const parameter of row.parameters) {
      if (parameter.in !== "path") continue;
      const entry = paramRows.find((candidate) => candidate.name === parameter.name);
      value = value.replace(`{${parameter.name}}`, encodeURIComponent(entry?.value ?? ""));
    }
    const query = paramRows.filter((candidate) => candidate.location === "query" && candidate.value !== "").map((candidate) => `${encodeURIComponent(candidate.name)}=${encodeURIComponent(candidate.value)}`);
    return query.length > 0 ? `${value}?${query.join("&")}` : value;
  }, [row, paramRows]);

  return <div className={styles.workspaceInner} data-testid="openapi-workspace">
    {!executable && <div className={styles.workspaceAnnounce}><InlineAlert tone="info" title={t("webui.openapi.run.mockDisabled")} /></div>}
    <div className={styles.requestArea} style={{ "--pane-flex": String(ratio) } as CSSProperties}>
      <RequestPane
        method={row.method}
        url={url}
        params={paramRows}
        bodyTypes={bodyTypes}
        bodyType={bodyType}
        onBodyTypeChange={setBodyType}
        bodyText={bodyText}
        onBodyTextChange={setBodyText}
        formRows={formRows}
        onFormChange={(name, value) => setFormRows((rows) => rows.map((fh) => (fh.name === name ? { ...fh, value } : fh)))}
        onFormFileChange={(name, file) => setFiles((current) => { const next = { ...current }; if (file) next[name] = file; else delete next[name]; return next; })}
        headers={headerRows}
        cookies={cookieRows}
        executable={executable}
        onParamChange={updateParam}
        onAddParam={() => setParamRows((rows) => [...rows, { name: "", value: "", kind: "text", required: false, description: "", location: "query" }])}
        onRemoveParam={(index) => setParamRows((rows) => rows.filter((_, i) => i !== index))}
        onHeaderChange={(index, patch) => setHeaderRows((rows) => rows.map((h, i) => (i === index ? { ...h, ...patch } : h)))}
        onAddHeader={() => setHeaderRows((rows) => [...rows, { name: "", value: "" }])}
        onRemoveHeader={(index) => setHeaderRows((rows) => rows.filter((_, i) => i !== index))}
        onCookieChange={(index, patch) => setCookieRows((rows) => rows.map((h, i) => (i === index ? { ...h, ...patch } : h)))}
        onAddCookie={() => setCookieRows((rows) => [...rows, { name: "", value: "" }])}
        onRemoveCookie={(index) => setCookieRows((rows) => rows.filter((_, i) => i !== index))}
        bearer={bearerToken}
        onBearerChange={setBearerToken}
        hasBearer={hasSecurityScheme(row, "bearerAuth")}
        hasSession={hasSecurityScheme(row, "webuiSession")}
        onExecute={() => void execute()}
        pending={runState.kind === "pending"}
      />
    </div>
    <Resizer ratio={ratio} onRatioChange={setRatio} />
    <div className={styles.responseArea} style={{ "--pane-flex": String(1 - ratio) } as CSSProperties}>
      <ResponsePane state={runState} />
    </div>
  </div>;
}
