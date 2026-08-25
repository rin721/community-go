import { useMemo, useState } from "react";
import { Button, Chip, Select, Spinner, TextArea } from "@heroui/react";
import { ListBox } from "@heroui/react";
import { DataTable, Drawer, Field, InlineAlert, type DataTableColumn } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { readWebUIDataSource } from "@webui/sdk/runtime";
import { loadSessionSnapshot } from "./api";
import { MethodBadge } from "./MethodBadge";
import { highlightJSON } from "./highlight";
import { formatBytes, type RunState } from "./run-store";
import {
  bodyTypeOptions, buildRequest, executionParameters, formFieldRows, hasSecurityScheme, isMutation,
  requestBodySchema, responseRows, sampleJSON,
  type BodyType, type ExecutionParameterRow, type FormFieldRow, type OperationRow, type ResponseRow, type SchemaObject,
} from "./openapi-data";
import styles from "./openapi.module.css";

const EXECUTION_TIMEOUT_MS = 20_000;

type Translate = (key: string, options?: Record<string, unknown>) => string;
type HeaderRow = { name: string; value: string };

function responseColumns(t: Translate): ReadonlyArray<DataTableColumn<ResponseRow>> {
  return [
    { id: "status", header: t("webui.openapi.table.status"), cell: (row) => <code className={styles.monoCell}>{row.status}</code> },
    { id: "description", header: t("webui.openapi.table.description"), cell: (row) => row.description },
    { id: "schema", header: t("webui.openapi.table.schema"), cell: (row) => <code className={styles.monoCell}>{row.schema}</code> },
  ];
}

// OperationDrawer hosts the docs/debug sections for one operation inside the
// platform Drawer (R075-006): standard admin form/table controls, execution
// with the established same-origin semantics and the response card at the end
// of the debug section.
export function OperationDrawer({ row, schemas, mode, onModeChange, onClose }: {
  row: OperationRow;
  schemas: Record<string, SchemaObject> | undefined;
  mode: "docs" | "debug";
  onModeChange: (mode: "docs" | "debug") => void;
  onClose: () => void;
}) {
  const { t } = useWebUITranslation("webui.openapi");
  const [parameters, setParameters] = useState<ExecutionParameterRow[]>(() => executionParameters(row));
  const bodySchema = requestBodySchema(row);
  const bodyTypes = useMemo(() => bodyTypeOptions(row), [row]);
  const [bodyType, setBodyType] = useState<BodyType>(bodyTypes[0] ?? "json");
  const [bodyText, setBodyText] = useState(() => {
    const sample = sampleJSON(bodySchema?.schema, schemas);
    return sample === null || sample === undefined ? "" : JSON.stringify(sample, null, 2);
  });
  const [formRows, setFormRows] = useState<FormFieldRow[]>(() => formFieldRows(bodySchema?.schema));
  const [files, setFiles] = useState<Record<string, File>>({});
  const [headersRows, setHeadersRows] = useState<HeaderRow[]>([{ name: "", value: "" }]);
  const [bearerToken, setBearerToken] = useState("");
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });
  const executable = readWebUIDataSource() !== "mock";

  const updateParameter = (name: string, value: string) => setParameters((current) => current.map((parameter) => (parameter.name === name ? { ...parameter, value } : parameter)));

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
      const pathValues = Object.fromEntries(parameters.filter((parameter) => parameter.location === "path").map((parameter) => [parameter.name, parameter.value]));
      const queryValues = Object.fromEntries(parameters.filter((parameter) => parameter.location === "query").map((parameter) => [parameter.name, parameter.value]));
      const extraHeaders = Object.fromEntries(headersRows.filter((header) => header.name.trim() !== "").map((header) => [header.name.trim(), header.value]));
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
      setRunState({ kind: "done", result: { ok: response.ok, status: response.status, statusText: response.statusText, durationMs, headers, body, sizeBytes: new TextEncoder().encode(body).length, bodyClass: classifyJSON(body) } });
    } catch (error) {
      setRunState({ kind: "error", message: error instanceof Error ? error.message : "request_failed" });
    }
  };

  const footer = <div className={styles.drawerFooter}>
    <Button variant="secondary" onPress={onClose}>{t("webui.openapi.drawer.close")}</Button>
    {mode === "debug" && executable && (
      <Button onPress={() => void execute()} isDisabled={runState.kind === "pending"}>
        {runState.kind === "pending" && <Spinner size="sm" />}
        {t(runState.kind === "pending" ? "webui.openapi.run.running" : "webui.openapi.run.execute")}
      </Button>
    )}
  </div>;

  return <Drawer
    open
    title={row.operationId}
    description={row.summary}
    closeLabel={t("webui.openapi.drawer.close")}
    onClose={onClose}
    footer={footer}
  >
    <div className={styles.drawerTitle}><MethodBadge method={row.method} /><code className={styles.monoCell}>{row.path}</code></div>
    <div className={styles.modeToggle}>
      <Button size="sm" variant={mode === "docs" ? "primary" : "ghost"} data-testid="openapi-mode-docs" onPress={() => onModeChange("docs")}>{t("webui.openapi.op.mode.docs")}</Button>
      <Button size="sm" variant={mode === "debug" ? "primary" : "ghost"} data-testid="openapi-mode-debug" onPress={() => onModeChange("debug")}>{t("webui.openapi.op.mode.debug")}</Button>
    </div>
    {!executable && <InlineAlert tone="info" title={t("webui.openapi.run.mockDisabled")} />}
    {mode === "docs"
      ? <DocsSection row={row} schemas={schemas} t={t} />
      : <div className={styles.debugSection}>
        <DebugParams parameters={parameters} onParameterChange={updateParameter} t={t} executable={executable} />
        {bodySchema && <BodyEditor
          bodySchema={bodySchema.schema}
          bodyTypes={bodyTypes}
          bodyType={bodyType}
          onBodyTypeChange={setBodyType}
          bodyText={bodyText}
          onBodyTextChange={setBodyText}
          formRows={formRows}
          onFormChange={(name, value) => setFormRows((current) => current.map((field) => (field.name === name ? { ...field, value } : field)))}
          onFormFileChange={(name, file) => setFiles((current) => {
            const next = { ...current };
            if (file) next[name] = file;
            else delete next[name];
            return next;
          })}
          t={t}
          executable={executable}
        />}
        <HeadersEditor headersRows={headersRows} onHeaderChange={(index, patch) => setHeadersRows((current) => current.map((header, i) => (i === index ? { ...header, ...patch } : header)))} t={t} executable={executable} />
        {(hasSecurityScheme(row, "bearerAuth") || hasSecurityScheme(row, "webuiSession")) && <section className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>{t("webui.openapi.detail.auth")}</h3>
          {hasSecurityScheme(row, "bearerAuth") && <Field label={t("webui.openapi.auth.bearer")} type="password" value={bearerToken} onChange={(event) => setBearerToken(event.target.value)} placeholder={t("webui.openapi.auth.bearerPlaceholder")} disabled={!executable} className={styles.authField} />}
          {hasSecurityScheme(row, "webuiSession") && <p className={styles.formHint}>{t("webui.openapi.auth.session")}</p>}
        </section>}
        {runState.kind === "error" && <InlineAlert tone="danger" title={t("webui.openapi.run.error")} detail={runState.message} />}
        <ResponseCard state={runState} />
      </div>}
  </Drawer>;
}

function classifyJSON(text: string): "json" | "text" {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[") ? "json" : "text";
}

function DocsSection({ row, schemas, t }: { row: OperationRow; schemas: Record<string, SchemaObject> | undefined; t: Translate }) {
  const bodySchema = requestBodySchema(row);
  const example = bodySchema ? sampleJSON(bodySchema.schema, schemas) : undefined;
  return <div className={styles.docsSection}>
    {row.summary && <p className={styles.formHint}>{row.summary}</p>}
    {row.description && <p className={styles.formHint}>{row.description}</p>}
    <section className={styles.formSection}>
      <h3 className={styles.formSectionTitle}>{t("webui.openapi.detail.params")}</h3>
      <DataTable columns={[
        { id: "name", header: t("webui.openapi.table.name"), cell: (p: ExecutionParameterRow) => <code className={styles.monoCell}>{p.name}</code> },
        { id: "location", header: t("webui.openapi.table.location"), cell: (p) => p.location },
        { id: "required", header: t("webui.openapi.table.required"), cell: (p) => (p.required ? t("webui.openapi.table.yes") : null) },
        { id: "type", header: t("webui.openapi.table.type"), cell: (p) => <code className={styles.monoCell}>{p.type}</code> },
      ]} rows={executionParameters(row)} ariaLabel={t("webui.openapi.detail.params")} getRowKey={(p) => `${p.location}.${p.name}`} />
    </section>
    {bodySchema && <section className={styles.formSection}>
      <h3 className={styles.formSectionTitle}>{t("webui.openapi.detail.body")}{bodySchema.required ? ` · ${t("webui.openapi.table.required")}` : ""}</h3>
      {example !== undefined && example !== null && <pre className={styles.exampleBlock}>{JSON.stringify(example, null, 2)}</pre>}
    </section>}
    <section className={styles.formSection}>
      <h3 className={styles.formSectionTitle}>{t("webui.openapi.detail.responses")}</h3>
      <DataTable columns={responseColumns(t)} rows={responseRows(row)} ariaLabel={t("webui.openapi.detail.responses")} getRowKey={(item) => item.status} />
    </section>
  </div>;
}

function DebugParams({ parameters, onParameterChange, t, executable }: {
  parameters: ExecutionParameterRow[];
  onParameterChange: (name: string, value: string) => void;
  t: Translate;
  executable: boolean;
}) {
  if (parameters.length === 0) return null;
  return <section className={styles.formSection}>
    <h3 className={styles.formSectionTitle}>{t("webui.openapi.detail.params")}</h3>
    <div className={styles.editorRows}>
      {parameters.map((parameter) => (
        <div key={`${parameter.location}.${parameter.name}`} className={styles.editorRow}>
          <span className={styles.editorCell}><code className={styles.monoCell}>{parameter.name}</code><span className={styles.formHint}>{parameter.location}{parameter.required ? ` · ${t("webui.openapi.table.required")}` : ""}</span></span>
          <Field label={parameter.name} value={parameter.value} onChange={(event) => onParameterChange(parameter.name, event.target.value)} disabled={!executable} className={styles.editorCellInput} />
        </div>
      ))}
    </div>
  </section>;
}

function BodyEditor({ bodyTypes, bodyType, onBodyTypeChange, bodyText, onBodyTextChange, formRows, onFormChange, onFormFileChange, t, executable }: {
  bodySchema: SchemaObject | undefined;
  bodyTypes: BodyType[];
  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  bodyText: string;
  onBodyTextChange: (value: string) => void;
  formRows: FormFieldRow[];
  onFormChange: (name: string, value: string) => void;
  onFormFileChange: (name: string, file: File | undefined) => void;
  t: Translate;
  executable: boolean;
}) {
  return <section className={styles.formSection}>
    <div className={styles.formSectionHead}>
      <h3 className={styles.formSectionTitle}>{t("webui.openapi.detail.body")}</h3>
      {bodyTypes.length > 1 && (
        <Select aria-label={t("webui.openapi.debug.bodyType")} selectedKey={bodyType} onSelectionChange={(key) => onBodyTypeChange(String(key) as BodyType)} className={styles.bodyTypeSelect}>
          <Select.Trigger><Select.Value /></Select.Trigger>
          <Select.Indicator />
          <Select.Popover>
            <ListBox>{bodyTypes.map((type) => <ListBox.Item key={type} id={type} textValue={type}>{t(`webui.openapi.debug.body.${type}`)}</ListBox.Item>)}</ListBox>
          </Select.Popover>
        </Select>
      )}
    </div>
    {bodyType === "json"
      ? <TextArea aria-label={t("webui.openapi.debug.body.json")} value={bodyText} onChange={(event) => onBodyTextChange(event.target.value)} rows={10} className={styles.bodyEditor} disabled={!executable} />
      : <div className={styles.editorRows}>
        {formRows.map((field) => (
          <div key={field.name} className={styles.editorRow}>
            <span className={styles.editorCell}><code className={styles.monoCell}>{field.name}</code><span className={styles.formHint}>{field.kind}</span></span>
            {field.kind === "file"
              ? <input type="file" className={styles.fileInput} aria-label={field.name} disabled={!executable} onChange={(event) => onFormFileChange(field.name, event.target.files?.[0])} />
              : <Field label={field.name} value={field.value} onChange={(event) => onFormChange(field.name, event.target.value)} disabled={!executable} className={styles.editorCellInput} />}
          </div>
        ))}
      </div>}
  </section>;
}

function HeadersEditor({ headersRows, onHeaderChange, t, executable }: {
  headersRows: HeaderRow[];
  onHeaderChange: (index: number, patch: Partial<HeaderRow>) => void;
  t: Translate;
  executable: boolean;
}) {
  return <section className={styles.formSection}>
    <h3 className={styles.formSectionTitle}>{t("webui.openapi.debug.headers")}</h3>
    <div className={styles.editorRows}>
      {headersRows.map((header, index) => (
        <div key={index} className={styles.editorRow}>
          <Field label={t("webui.openapi.debug.name")} value={header.name} onChange={(event) => onHeaderChange(index, { name: event.target.value })} disabled={!executable} className={styles.editorCellInput} />
          <Field label={t("webui.openapi.debug.value")} value={header.value} onChange={(event) => onHeaderChange(index, { value: event.target.value })} disabled={!executable} className={styles.editorCellInput} />
        </div>
      ))}
    </div>
  </section>;
}

// ResponseCard presents the debug result in the platform card style: status
// chip, duration and size, JSON highlighted / raw body and response headers.
function ResponseCard({ state }: { state: RunState }) {
  const { t } = useWebUITranslation("webui.openapi");
  const [view, setView] = useState<"json" | "raw">("json");
  if (state.kind === "idle") {
    return <section className={styles.responseCard} data-testid="openapi-response">
      <p className={styles.responseIdle}>{t("webui.openapi.response.empty")}</p>
    </section>;
  }
  if (state.kind === "pending") {
    return <section className={styles.responseCard} data-testid="openapi-response">
      <div className={styles.responsePending}><Spinner size="sm" /><span>{t("webui.openapi.run.running")}</span></div>
    </section>;
  }
  if (state.kind === "error") {
    return <section className={styles.responseCard} data-testid="openapi-response">
      <InlineAlert tone="danger" title={t("webui.openapi.run.error")} detail={state.message} />
    </section>;
  }
  const result = state.result;
  const statusClass = result.status < 300 ? styles.statusOk : result.status < 400 ? styles.statusWarn : styles.statusError;
  const headerLines = Object.entries(result.headers).map(([name, value]) => `${name}: ${value}`).join("\n");
  return <section className={styles.responseCard} data-testid="openapi-response">
    <div className={styles.responseMeta}>
      <Chip className={statusClass} size="sm">{result.status} {result.statusText}</Chip>
      <span className={styles.responseStat}>{t("webui.openapi.response.duration", { ms: result.durationMs })}</span>
      <span className={styles.responseStat}>{formatBytes(result.sizeBytes)}</span>
      {result.bodyClass === "json" && view === "json"
        ? <Button size="sm" variant="ghost" onPress={() => setView("raw")}>{t("webui.openapi.response.view.raw")}</Button>
        : result.bodyClass === "json"
          ? <Button size="sm" variant="ghost" onPress={() => setView("json")}>{t("webui.openapi.response.view.json")}</Button>
          : null}
    </div>
    <pre className={styles.responseBody} data-testid="openapi-response-body">
      {result.bodyClass === "json" && view === "json"
        ? <code dangerouslySetInnerHTML={{ __html: highlightJSON(result.body) }} />
        : result.body}
    </pre>
    {headerLines !== "" && <details className={styles.responseHeaders}>
      <summary>{t("webui.openapi.response.headers")}</summary>
      <pre className={styles.monoBlock}>{headerLines}</pre>
    </details>}
  </section>;
}