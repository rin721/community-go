import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Field, PageHeader, PageSection, type DataTableColumn } from "@webui/sdk/ui";
import { useOptionalHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { webuiOpenAPISpec } from "@webui/generated/openapi-spec";
import { MethodBadge } from "./MethodBadge";
import { filterOperationGroups, groupedOperations, isOpenAPIDocument, type OpenAPIDocument, type OperationRow } from "./openapi-data";
import styles from "./openapi.module.css";

type Translate = (key: string, options?: Record<string, unknown>) => string;

// OpenAPITagPage lists the operations of one contract category (/openapi/tags,
// ?tag=). The tag is the single hierarchy level under the overview directory:
// row actions navigate to the operation docs/debug page. The page derives the
// selected tag from the browser location on every render (host navigate and
// back/forward re-render the route tree, mirroring the SettingsLayout pattern)
// and issues no requests of its own.
export default function OpenAPITagPage() {
  const { t } = useWebUITranslation("webui.openapi");
  const runtime = useOptionalHostRuntime();
  const navigate = runtime?.navigate;
  const tag = useMemo(() => new URLSearchParams(window.location.search).get("tag") ?? "", [window.location.search]);
  const [search, setSearch] = useState("");

  const usable = isOpenAPIDocument(webuiOpenAPISpec);
  const document = webuiOpenAPISpec as unknown as OpenAPIDocument;
  const groups = useMemo(() => (usable ? groupedOperations(document) : []), [usable, document]);
  const group = groups.find((candidate) => candidate.tag === tag);
  const rows = useMemo(() => {
    const searched = filterOperationGroups(group ? [group] : [], search);
    return searched.flatMap((item) => item.operations);
  }, [group, search]);

  const columns = useMemo<ReadonlyArray<DataTableColumn<OperationRow>>>(() => tagColumns(t, (row, mode) => navigate?.(`/openapi/operation?op=${encodeURIComponent(row.id)}&mode=${mode}`)), [navigate, t]);

  return <div className="module-page">
    <PageHeader eyebrow={t("webui.openapi.docs.eyebrow")} title={group ? group.tag : t("webui.openapi.tags.title")} description={group ? t("webui.openapi.tags.detail", { count: group.operations.length }) : undefined} />
    <div className="page-sections">
      {!usable
        ? <EmptyState title={t("webui.openapi.tags.title")} detail={t("webui.openapi.docs.unavailable")} />
        : !group
          ? <EmptyState title={t("webui.openapi.tags.title")} detail={tag === "" ? t("webui.openapi.tags.missing") : t("webui.openapi.tags.unknown", { tag })} />
          : <PageSection
              title={group.tag}
              description={t("webui.openapi.tags.detail", { count: group.operations.length })}
              actions={<Field label={t("webui.openapi.list.search")} className={styles.listSearch} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />}
            >
              <DataTable columns={columns} rows={rows} ariaLabel={group.tag} getRowKey={(row) => row.id} emptyState={<EmptyState title={t("webui.openapi.list.empty")} />} />
            </PageSection>}
    </div>
  </div>;
}

function tagColumns(t: Translate, openOperation: (row: OperationRow, mode: "docs" | "debug") => void): ReadonlyArray<DataTableColumn<OperationRow>> {
  return [
    { id: "method", header: t("webui.openapi.table.method"), cell: (row) => <MethodBadge method={row.method} /> },
    { id: "path", header: t("webui.openapi.table.path"), cell: (row) => <code className={styles.monoCell}>{row.path}</code> },
    { id: "operationId", header: t("webui.openapi.table.operation"), cell: (row) => row.operationId },
    { id: "actions", header: t("webui.openapi.table.actions"), cell: (row) => (
      <div className={styles.rowActions}>
        <Button type="button" variant="ghost" onClick={() => openOperation(row, "docs")}>{t("webui.openapi.table.docs")}</Button>
        <Button type="button" variant="ghost" onClick={() => openOperation(row, "debug")}>{t("webui.openapi.table.debug")}</Button>
      </div>
    ) },
  ];
}