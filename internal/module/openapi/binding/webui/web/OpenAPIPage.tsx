import { useMemo, useState } from "react";
import {
  Button, DataCard, DataTable, EmptyState, InlineAlert, PageHeader, PageSection, Surface,
  type DataTableColumn,
} from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { webuiOpenAPISpec, webuiOpenAPISpecSourceRevision } from "@webui/generated/openapi-spec";
import {
  groupedOperations, isOpenAPIDocument, parameterRows, requestBodyRow, responseRows, schemaPropertyRows,
  type OpenAPIDocument, type OperationGroup, type OperationRow, type ParameterRow, type ResponseRow, type SchemaPropertyRow,
} from "./openapi-data";
import styles from "./openapi.module.css";

// Translate is the narrow localisation callback type (assignable from react-i18next TFunction).
type Translate = (key: string, options?: Record<string, unknown>) => string;

// MethodBadge is the HTTP method badge (module-internal component, R075-003):
// the platform SDK has no HTTP-method component, and the method is a protocol
// token (not user copy), so the badge keeps its semantic colors in module css.
function MethodBadge({ method }: { method: string }) {
  return <span className={styles.methodBadge} data-method={method.toLowerCase()}>{method}</span>;
}

function parameterColumns(t: Translate): ReadonlyArray<DataTableColumn<ParameterRow>> {
  return [
    { id: "name", header: t("webui.openapi.table.name"), cell: (row) => <code className={styles.monoCell}>{row.name}</code> },
    { id: "location", header: t("webui.openapi.table.location"), cell: (row) => row.location },
    { id: "required", header: t("webui.openapi.table.required"), cell: (row) => (row.required ? t("webui.openapi.table.yes") : null) },
    { id: "type", header: t("webui.openapi.table.type"), cell: (row) => <code className={styles.monoCell}>{row.type}</code> },
    { id: "description", header: t("webui.openapi.table.description"), cell: (row) => row.description },
  ];
}

function responseColumns(t: Translate): ReadonlyArray<DataTableColumn<ResponseRow>> {
  return [
    { id: "status", header: t("webui.openapi.table.status"), cell: (row) => <code className={styles.monoCell}>{row.status}</code> },
    { id: "description", header: t("webui.openapi.table.description"), cell: (row) => row.description },
    { id: "schema", header: t("webui.openapi.table.schema"), cell: (row) => <code className={styles.monoCell}>{row.schema}</code> },
  ];
}

function schemaColumns(t: Translate): ReadonlyArray<DataTableColumn<SchemaPropertyRow>> {
  return [
    { id: "name", header: t("webui.openapi.table.name"), cell: (row) => <code className={styles.monoCell}>{row.name}</code> },
    { id: "type", header: t("webui.openapi.table.type"), cell: (row) => <code className={styles.monoCell}>{row.type}</code> },
    { id: "required", header: t("webui.openapi.table.required"), cell: (row) => (row.required ? t("webui.openapi.table.yes") : null) },
    { id: "description", header: t("webui.openapi.table.description"), cell: (row) => row.description },
  ];
}

// OperationCard is an expandable row per operation: method badge + path +
// operationId + summary, expanding to parameter/request-body/response views
// built entirely from platform components (R075-003).
function OperationCard({ row, t }: { row: OperationRow; t: Translate }) {
  const [expanded, setExpanded] = useState(false);
  const parameters = parameterRows(row);
  const responses = responseRows(row);
  const requestBody = requestBodyRow(row);
  return <Surface className={styles.operationCard} data-testid="openapi-operation">
    <div className={styles.operationHeader}>
      <MethodBadge method={row.method} />
      <code className={styles.operationPath}>{row.path}</code>
      <span className={styles.operationId}>{row.operationId}</span>
      <span className={styles.operationSpacer} />
      <Button variant="ghost" className={styles.operationToggle} onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
        {t(expanded ? "webui.openapi.operations.collapse" : "webui.openapi.operations.expand")}
      </Button>
    </div>
    {row.summary && <p className={styles.operationSummary}>{row.summary}</p>}
    {expanded && <div className={styles.operationDetails}>
      {requestBody && <p className={styles.requestBodyLine}>{t("webui.openapi.request.body")}: <code className={styles.monoCell}>{requestBody.schema}</code>{requestBody.required ? ` · ${t("webui.openapi.table.required")}` : ""}</p>}
      {parameters.length > 0 && <DataTable columns={parameterColumns(t)} rows={parameters} ariaLabel={t("webui.openapi.table.parameters")} getRowKey={(item) => `${item.location}.${item.name}`} />}
      <DataTable columns={responseColumns(t)} rows={responses} ariaLabel={t("webui.openapi.table.responses")} getRowKey={(item) => item.status} />
    </div>}
  </Surface>;
}

function OperationGroupView({ group, t }: { group: OperationGroup; t: Translate }) {
  return <section className={styles.operationGroup}>
    <h3 className={styles.operationGroupTitle}>{group.tag}</h3>
    <div className={styles.operationList}>{group.operations.map((row) => <OperationCard key={row.id} row={row} t={t} />)}</div>
  </section>;
}

// SchemaCard shows one model's property table (DataCard + DataTable).
function SchemaCard({ name, schema, t }: { name: string; schema: Parameters<typeof schemaPropertyRows>[0]; t: Translate }) {
  const rows = schemaPropertyRows(schema);
  return <div className={styles.schemaCard} data-testid="openapi-schema">
    <DataCard className={styles.schemaCardInner} kicker="schema" title={name}>
      <DataTable columns={schemaColumns(t)} rows={rows} ariaLabel={name} getRowKey={(row) => row.name} emptyState={<EmptyState title={t("webui.openapi.schemas.empty")} />} />
    </DataCard>
  </div>;
}

export default function OpenAPIPage() {
  const { t } = useWebUITranslation("webui.openapi");
  const usable = isOpenAPIDocument(webuiOpenAPISpec);
  const document = webuiOpenAPISpec as unknown as OpenAPIDocument;
  const groups = useMemo(() => (usable ? groupedOperations(document) : []), [usable, document]);
  const schemas = useMemo(() => (usable ? Object.entries(document.components?.schemas ?? {}) : []), [usable, document]);
  const info = document.info ?? {};
  return <div className={`${styles.openapiModule} module-page`}>
    <PageHeader eyebrow={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.title")} description={t("webui.openapi.docs.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.legend.title")} description={t("webui.openapi.docs.legend.detail")}>
        <p className={styles.openapiMeta}>{t("webui.openapi.docs.contract", { title: info.title ?? "", version: info.version ?? "" })}</p>
        <p className={styles.openapiMeta}>{t("webui.openapi.docs.source", { revision: webuiOpenAPISpecSourceRevision })}</p>
      </PageSection>
      {!usable
        ? <InlineAlert tone="danger" title={t("webui.openapi.docs.unavailable")} />
        : <>
          <PageSection title={t("webui.openapi.operations.title")} description={t("webui.openapi.operations.detail")}>
            {groups.length === 0
              ? <EmptyState title={t("webui.openapi.operations.empty")} />
              : <div className={styles.operationGroups}>{groups.map((group) => <OperationGroupView key={group.tag} group={group} t={t} />)}</div>}
          </PageSection>
          <PageSection title={t("webui.openapi.schemas.title")} description={t("webui.openapi.schemas.detail")}>
            {schemas.length === 0
              ? <EmptyState title={t("webui.openapi.schemas.empty")} />
              : <div className={styles.schemaList}>{schemas.map(([name, schema]) => <SchemaCard key={name} name={name} schema={schema} t={t} />)}</div>}
          </PageSection>
        </>}
    </div>
  </div>;
}