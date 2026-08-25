import { useState } from "react";
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

// SchemasView browses components.schemas: a model list on the left and the
// selected model's property table on the right (all platform components,
// R075-004).
export function SchemasView({ schemas }: { schemas: Record<string, SchemaObject> }) {
  const { t } = useWebUITranslation("webui.openapi");
  const names = Object.keys(schemas);
  const [selected, setSelected] = useState<string | null>(names[0] ?? null);
  const rows = selected ? schemaPropertyRows(schemas[selected]) : [];
  return <div className={styles.schemasLayout}>
    <nav className={styles.modelList} aria-label={t("webui.openapi.views.schemas")}>
      {names.map((name) => (
        <button
          key={name}
          type="button"
          className={styles.modelItem}
          data-testid="openapi-model-item"
          aria-current={selected === name ? "page" : undefined}
          onClick={() => setSelected(name)}
        >
          {name}
        </button>
      ))}
    </nav>
    <div className={styles.modelDetail}>
      {selected
        ? <DataTable columns={schemaColumns(t)} rows={rows} ariaLabel={selected} getRowKey={(row) => row.name}
            emptyState={<EmptyState title={t("webui.openapi.schemas.empty")} />} />
        : <EmptyState title={t("webui.openapi.schemas.selectHint")} />}
    </div>
  </div>;
}