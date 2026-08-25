import { DataTable, EmptyState, type DataTableColumn } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { schemaPropertyRows, type SchemaObject, type SchemaPropertyRow } from "./openapi-data";
import styles from "./openapi.module.css";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function schemaColumns(t: Translate): ReadonlyArray<DataTableColumn<SchemaPropertyRow>> {
  return [
    { id: "name", header: t("webui.openapi.table.name"), cell: (row) => <code className={styles.monoCell}>{row.name}</code> },
    { id: "type", header: t("webui.openapi.table.type"), cell: (row) => <code className={styles.monoCell}>{row.type}</code> },
    { id: "required", header: t("webui.openapi.table.required"), cell: (row) => (row.required ? t("webui.openapi.table.yes") : null) },
    { id: "description", header: t("webui.openapi.table.description"), cell: (row) => row.description },
  ];
}

// ModelPane renders one data-model definition as a workspace tab (R075-005):
// the model header and its property table, all from platform data-table
// primitives (HeroUI/RAC based).
export function ModelPane({ name, schema }: { name: string; schema: SchemaObject | undefined }) {
  const { t } = useWebUITranslation("webui.openapi");
  const rows = schemaPropertyRows(schema);
  return <div className={styles.modelPane} data-testid="openapi-model-pane">
    <div className={styles.modelPaneHeader}>
      <code className={styles.modelPaneName}>{name}</code>
      <span className={styles.modelPaneType}>{t("webui.openapi.modelPane.type")}</span>
    </div>
    <DataTable columns={schemaColumns(t)} rows={rows} ariaLabel={name} getRowKey={(row) => row.name}
      emptyState={<EmptyState title={t("webui.openapi.schemas.empty")} />} />
  </div>;
}