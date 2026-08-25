import { useMemo, useState } from "react";
import { Button, Chip, Select, Spinner, TextArea } from "@heroui/react";
import { ListBox } from "@heroui/react";
import { DataTable, Field, InlineAlert, type DataTableColumn } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { readWebUIDataSource } from "@webui/sdk/runtime";
import { loadSessionSnapshot } from "./api";
import { MethodBadge } from "./MethodBadge";
import {
  bodyTypeOptions, buildRequest, executionParameters, formFieldRows, hasSecurityScheme, isMutation,
  requestBodySchema, responseRows, sampleJSON,
  type BodyType, type ExecutionParameterRow, type FormFieldRow, type OperationRow, type ResponseRow, type SchemaObject,
} from "./openapi-data";
import type { RunState } from "./run-store";
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

// OperationPane is the Apifox interface tab (R075-005): the request bar
// (method + path + send), the docs/debug mode toggle and the editable parameter
// / body / header / auth sections. Execution follows the established same-origin
// semantics (bearer token in memory, session cookie + CSRF for webuiSession
// mutations) and reports into the page-level run state for the right panel.
export function OperationPane({ row, schemas, mode, onModeChange, runState, onRunChange }: {
  row: OperationRow;
  schemas: Record<string, SchemaObject> | undefined;
  mode: "docs" | "debug";
  onModeChange: (mode: "docs" | "debug") => void;
  runState: RunState;
  onRunChange: (state: RunState) => void;
}) {
  const { t } = useWebUITranslation("webui.openapi");
  const bodySchema = requestBodySchema(row);
  const bodyTypes = useMemo(() => bodyTypeOptions(row), [row]);
  const [parameters, setParameters] = useState<ExecutionParameterRow[]>(() => executionParameters(row));
  const [bodyType, setBodyType] = useState<BodyType>(bodyTypes[0] ?? "json");
  const [bodyText, setBodyText] = useState(() => {
    const sample = sampleJSON(bodySchema?.schema, schemas);
    return sample === null || sample === undefined ? "" : JSON.stringify(sample, null, 2);
  });
  const [formRows, setFormRows] = useState<FormFieldRow[]>(() => formFieldRows(bodySchema?.schema));
  const [files, setFiles] = useState<Record<string, File>>({});
  const [headersRows, setHeadersRows] = useState<HeaderRow[]>([{ name: "", value: "" }]);
  const [bearerToken, setBearerToken] = useState("");
  const executable = readWebUIDataSource() !== "mock";

  const run = async () => {
    if (bodyText.trim() !== "" && bodyType === "json" && bodySchema) {
      try {
        JSON.parse(bodyText);
      } catch {
        onRunChange({ kind: "error", message: t("webui.openapi.run.invalidJson") });
        return;
      }
    }
    onRunChange({ kind: "pending" });
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
        formEntries: [], extraHeaders, bearerToken, csrfToken, origin: window.location.origin,
      });
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);
      const started = performance.now();
      let response: Response;
      try {
        const init: RequestInit = { method: built.method, headers: built.headers, credentials: "include", signal: controller.signal };
        if (bodyType === "form") {
          // multipart/form-data: the browser sets the boundary; file fields
          // only join when the user actually picked a file.
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
      onRunChange({ kind: "done", result: { ok: response.ok, status: response.status, statusText: response.statusText, durationMs, headers, body, sizeBytes: new TextEncoder().encode(body).length, bodyClass: "json" } });
    } catch (error) {
      onRunChange({ kind: "error", message: error instanceof Error ? error.message : "request_failed" });
    }
  };

  const updateParameter = (name: string, value: string) => setParameters((current) => current.map((parameter) => (parameter.name === name ? { ...parameter, value } : parameter)));
  const updateFormRow = (name: string, value: string) => setFormRows((current) => current.map((field) => (field.name === name ? { ...field, value } : field)));
  const selectFormFile = (name: string, file: File | undefined) => {
    setFiles((current) => {
      const next = { ...current };
      if (file) next[name] = file;
      else delete next[name];
      return next;
    });
  };
  const updateHeaderRow = (index: number, patch: Partial<HeaderRow>) => setHeadersRows((current) => current.map((header, i) => (i === index ? { ...header, ...patch } : header)));

  return <div className={styles.opPane} data-testid="openapi-operation">
    <div className={styles.requestBar}>
      <MethodBadge method={row.method} />
      <code className={styles.requestPath}>{row.path}</code>
      <span className={styles.requestSpacer} />
      {executable
        ? <Button
            size="sm"
            isDisabled={runState.kind === "pending"}
            onPress={() => void run()}
            className={styles.runButton}
          >
            {runState.kind === "pending" && <Spinner size="sm" />}
            {t(runState.kind === "pending" ? "webui.openapi.run.running" : "webui.openapi.run.execute")}
          </Button>
        : <Chip className={styles.mockChip} size="sm" variant="soft">{t("webui.openapi.run.mockDisabled")}</Chip>}
    </div>
    <div className={styles.modeToggle} role="tablist" aria-label={row.operationId}>
      <Button size="sm" variant={mode === "docs" ? "primary" : "ghost"} data-testid="openapi-mode-docs" onPress={() => onModeChange("docs")}>{t("webui.openapi.op.mode.docs")}</Button>
      <Button size="sm" variant={mode === "debug" ? "primary" : "ghost"} data-testid="openapi-mode-debug" onPress={() => onModeChange("debug")}>{t("webui.openapi.op.mode.debug")}</Button>
    </div>
    {mode === "docs"
      ? <DocsView row={row} schemas={schemas} t={t} />
      : <DebugView
          t={t}
          parameters={parameters}
          onParameterChange={updateParameter}
          bodySchema={bodySchema?.schema}
          bodyTypes={bodyTypes}
          bodyType={bodyType}
          onBodyTypeChange={setBodyType}
          bodyText={bodyText}
          onBodyTextChange={setBodyText}
          formRows={formRows}
          onFormChange={updateFormRow}
          onFormFileChange={selectFormFile}
          headersRows={headersRows}
          onHeaderChange={updateHeaderRow}
          bearerToken={bearerToken}
          onBearerChange={setBearerToken}
          needsBearer={hasSecurityScheme(row, "bearerAuth")}
          sessionNote={hasSecurityScheme(row, "webuiSession")}
          executable={executable}
        />}
    {runState.kind === "error" && <InlineAlert tone="danger" title={t("webui.openapi.run.error")} detail={runState.message} />}
  </div>;
}

function DocsView({ row, schemas, t }: { row: OperationRow; schemas: Record<string, SchemaObject> | undefined; t: Translate }) {
  const bodySchema = requestBodySchema(row);
  const example = bodySchema ? sampleJSON(bodySchema.schema, schemas) : undefined;
  return <div className={styles.opDocs}>
    {row.summary && <p className={styles.opSummary}>{row.summary}</p>}
    {row.description && <p className={styles.opSummary}>{row.description}</p>}
    <section className={styles.opSection}>
      <h3 className={styles.opSectionTitle}>{t("webui.openapi.detail.params")}</h3>
      <DataTable columns={[
        { id: "name", header: t("webui.openapi.table.name"), cell: (p: ExecutionParameterRow) => <code className={styles.monoCell}>{p.name}</code> },
        { id: "location", header: t("webui.openapi.table.location"), cell: (p) => p.location },
        { id: "required", header: t("webui.openapi.table.required"), cell: (p) => (p.required ? t("webui.openapi.table.yes") : null) },
        { id: "type", header: t("webui.openapi.table.type"), cell: (p) => <code className={styles.monoCell}>{p.type}</code> },
      ]} rows={executionParameters(row)} ariaLabel={t("webui.openapi.detail.params")} getRowKey={(p) => `${p.location}.${p.name}`} />
    </section>
    {bodySchema && <section className={styles.opSection}>
      <h3 className={styles.opSectionTitle}>{t("webui.openapi.detail.body")}{bodySchema.required ? ` · ${t("webui.openapi.table.required")}` : ""}</h3>
      {example !== undefined && example !== null && <pre className={styles.exampleBlock}>{JSON.stringify(example, null, 2)}</pre>}
    </section>}
    <section className={styles.opSection}>
      <h3 className={styles.opSectionTitle}>{t("webui.openapi.detail.responses")}</h3>
      <DataTable columns={responseColumns(t)} rows={responseRows(row)} ariaLabel={t("webui.openapi.detail.responses")} getRowKey={(item) => item.status} />
    </section>
  </div>;
}

function DebugView({ t, parameters, onParameterChange, bodySchema, bodyTypes, bodyType, onBodyTypeChange, bodyText, onBodyTextChange, formRows, onFormChange, onFormFileChange, headersRows, onHeaderChange, bearerToken, onBearerChange, needsBearer, sessionNote, executable }: {
  t: Translate;
  parameters: ExecutionParameterRow[];
  onParameterChange: (name: string, value: string) => void;
  bodySchema: SchemaObject | undefined;
  bodyTypes: BodyType[];
  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  bodyText: string;
  onBodyTextChange: (value: string) => void;
  formRows: FormFieldRow[];
  onFormChange: (name: string, value: string) => void;
  onFormFileChange: (name: string, file: File | undefined) => void;
  headersRows: HeaderRow[];
  onHeaderChange: (index: number, patch: Partial<HeaderRow>) => void;
  bearerToken: string;
  onBearerChange: (value: string) => void;
  needsBearer: boolean;
  sessionNote: boolean;
  executable: boolean;
}) {
  return <div className={styles.opDebug}>
    {parameters.length > 0 && <section className={styles.opSection}>
      <h3 className={styles.opSectionTitle}>{t("webui.openapi.detail.params")}</h3>
      <div className={styles.editorRows}>
        {parameters.map((parameter) => (
          <div key={`${parameter.location}.${parameter.name}`} className={styles.editorRow}>
            <span className={styles.editorCell}><code className={styles.monoCell}>{parameter.name}</code><span className={styles.editorHint}>{parameter.location}{parameter.required ? ` · ${t("webui.openapi.table.required")}` : ""}</span></span>
            <InputCell value={parameter.value} onChange={(value) => onParameterChange(parameter.name, value)} label={parameter.name} disabled={!executable} />
          </div>
        ))}
      </div>
    </section>}
    {bodySchema && <section className={styles.opSection}>
      <div className={styles.opSectionHead}>
        <h3 className={styles.opSectionTitle}>{t("webui.openapi.detail.body")}</h3>
        {bodyTypes.length > 1 && (
          <Select selectedKey={bodyType} onSelectionChange={(key) => onBodyTypeChange(String(key) as BodyType)} className={styles.bodyTypeSelect} aria-label={t("webui.openapi.debug.bodyType")}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Indicator />
            <Select.Popover>
              <ListBox>{bodyTypes.map((type) => <ListBox.Item key={type} id={type} textValue={type}>{t(`webui.openapi.debug.body.${type}`)}</ListBox.Item>)}</ListBox>
            </Select.Popover>
          </Select>
        )}
      </div>
      {bodyType === "json"
        ? <TextArea aria-label={t("webui.openapi.debug.body.json")} value={bodyText} onChange={(event) => onBodyTextChange(event.target.value)} rows={10} className={styles.bodyEditor} />
        : <div className={styles.editorRows}>
          {formRows.map((field) => (
            <div key={field.name} className={styles.editorRow}>
              <span className={styles.editorCell}><code className={styles.monoCell}>{field.name}</code><span className={styles.editorHint}>{field.kind}</span></span>
              {field.kind === "file"
                ? <input type="file" className={styles.fileInput} aria-label={field.name} disabled={!executable}
                    onChange={(event) => onFormFileChange(field.name, event.target.files?.[0])} />
                : <InputCell value={field.value} onChange={(value) => onFormChange(field.name, value)} label={field.name} disabled={!executable} />}
            </div>
          ))}
        </div>}
    </section>}
    <section className={styles.opSection}>
      <h3 className={styles.opSectionTitle}>{t("webui.openapi.debug.headers")}</h3>
      <div className={styles.editorRows}>
        {headersRows.map((header, index) => (
          <div key={index} className={styles.editorRow}>
            <InputCell value={header.name} onChange={(value) => onHeaderChange(index, { name: value })} label={t("webui.openapi.debug.name")} disabled={!executable} />
            <InputCell value={header.value} onChange={(value) => onHeaderChange(index, { value })} label={t("webui.openapi.debug.value")} disabled={!executable} />
          </div>
        ))}
      </div>
    </section>
    {(needsBearer || sessionNote) && <section className={styles.opSection}>
      <h3 className={styles.opSectionTitle}>{t("webui.openapi.detail.auth")}</h3>
      {needsBearer && <Field label={t("webui.openapi.auth.bearer")} type="password" value={bearerToken} onChange={(event) => onBearerChange(event.target.value)} placeholder={t("webui.openapi.auth.bearerPlaceholder")} disabled={!executable} className={styles.authField} />}
      {sessionNote && <p className={styles.sessionNote}>{t("webui.openapi.auth.session")}</p>}
    </section>}
  </div>;
}

// InputCell renders a labelled HeroUI input as an editable table cell (rows
// stay vertically aligned in the Apifox editor grid).
function InputCell({ value, onChange, label, disabled }: { value: string; onChange: (value: string) => void; label: string; disabled: boolean }) {
  return <Field className={styles.editorCellInput} label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />;
}