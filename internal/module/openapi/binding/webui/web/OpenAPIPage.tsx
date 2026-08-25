import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import {
  DataTable, EmptyState, Field, InlineAlert, PageHeader, PageSection, SelectField,
  type DataTableColumn,
} from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { webuiOpenAPISpec, webuiOpenAPISpecSourceRevision } from "@webui/generated/openapi-spec";
import { CommandPalette } from "./CommandPalette";
import { MethodBadge } from "./MethodBadge";
import { ModelDrawer } from "./ModelDrawer";
import { OperationDrawer } from "./OperationDrawer";
import {
  filterOperationGroups, groupedOperations, isOpenAPIDocument,
  type OpenAPIDocument, type OperationRow,
} from "./openapi-data";
import styles from "./openapi.module.css";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export type OpenAPISelection = { kind: "operation"; row: OperationRow } | { kind: "model"; name: string };

// OpenAPIPage presents the API contract in the platform design language
// (R075-006): a standard admin list with search and tag filter, row actions
// opening the docs/debug drawer, and a models section. The active operation
// deep-links through ?op=&mode= so the drawer survives reloads.
export default function OpenAPIPage() {
  const { t } = useWebUITranslation("webui.openapi");
  const usable = isOpenAPIDocument(webuiOpenAPISpec);
  const document = webuiOpenAPISpec as unknown as OpenAPIDocument;
  const allGroups = useMemo(() => (usable ? groupedOperations(document) : []), [usable, document]);
  const rowsById = useMemo(() => new Map(allGroups.flatMap((group) => group.operations).map((row) => [row.id, row])), [allGroups]);
  const modelNames = useMemo(() => Object.keys(document.components?.schemas ?? {}), [document]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [selection, setSelection] = useState<OpenAPISelection | null>(null);
  const [mode, setMode] = useState<"docs" | "debug">("docs");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const syncSearch = useCallback((selected: OpenAPISelection | null, nextMode: "docs" | "debug") => {
    const params = new URLSearchParams();
    if (selected?.kind === "operation") {
      params.set("op", selected.row.id);
      params.set("mode", nextMode);
    } else if (selected?.kind === "model") {
      params.set("model", selected.name);
    }
    const next = params.toString();
    window.history.replaceState(null, "", next ? `?${next}` : "/openapi");
  }, []);

  const openOperation = useCallback((row: OperationRow, nextMode: "docs" | "debug") => {
    setSelection({ kind: "operation", row });
    setMode(nextMode);
    syncSearch({ kind: "operation", row }, nextMode);
  }, [syncSearch]);

  const openModel = useCallback((name: string) => {
    setSelection({ kind: "model", name });
    syncSearch({ kind: "model", name }, "docs");
  }, [syncSearch]);

  const closeDrawer = useCallback(() => {
    setSelection(null);
    syncSearch(null, "docs");
  }, [syncSearch]);

  // Deep link: initial load + popstate restore.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const op = params.get("op");
    const model = params.get("model");
    if (op && rowsById.has(op)) {
      setSelection({ kind: "operation", row: rowsById.get(op)! });
      setMode(params.get("mode") === "debug" ? "debug" : "docs");
    } else if (model && modelNames.includes(model)) {
      setSelection({ kind: "model", name: model });
    }
  }, [modelNames, rowsById]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const op = params.get("op");
      const model = params.get("model");
      if (op && rowsById.has(op)) {
        setSelection({ kind: "operation", row: rowsById.get(op)! });
        setMode(params.get("mode") === "debug" ? "debug" : "docs");
      } else if (model && modelNames.includes(model)) {
        setSelection({ kind: "model", name: model });
      } else {
        setSelection(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [modelNames, rowsById]);

  // Cmd/Ctrl+K global search.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const searched = filterOperationGroups(allGroups, search);
    return tagFilter === "" ? searched : searched.filter((group) => group.tag === tagFilter);
  }, [allGroups, search, tagFilter]);

  const rows = useMemo(() => filtered.flatMap((group) => group.operations), [filtered]);
  const tagOptions = useMemo(() => allGroups.map((group) => ({ value: group.tag, label: group.tag })), [allGroups]);
  const counts = useMemo(() => ({ total: allGroups.reduce((sum, group) => sum + group.operations.length, 0), shown: rows.length }), [allGroups, rows]);

  const columns = useMemo<ReadonlyArray<DataTableColumn<OperationRow>>>(() => operationColumns(t, openOperation), [t, openOperation]);

  return <div className={`${styles.openapiModule} module-page`}>
    <PageHeader eyebrow={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.title")} description={t("webui.openapi.docs.description")} actions={
      <Button variant="secondary" size="md" onPress={() => setPaletteOpen(true)}>{t("webui.openapi.palette.title")}</Button>
    } />
    <div className="page-sections">
      <PageSection kicker={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.legend.title")} description={t("webui.openapi.docs.legend.detail")}>
        <p className={styles.pageMeta}>{t("webui.openapi.docs.contract", { title: document.info?.title ?? "", version: document.info?.version ?? "" })}</p>
        <p className={styles.pageMeta}>{t("webui.openapi.docs.source", { revision: webuiOpenAPISpecSourceRevision })}</p>
      </PageSection>
      {!usable
        ? <InlineAlert tone="danger" title={t("webui.openapi.docs.unavailable")} />
        : <PageSection
            title={t("webui.openapi.list.title")}
            description={t("webui.openapi.list.detail", { total: counts.total, shown: counts.shown })}
            actions={<div className="toolbar">
              <Field label={t("webui.openapi.list.search")} className={styles.listSearch} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
              <SelectField label={t("webui.openapi.list.filterTag")} value={tagFilter} options={[{ value: "", label: t("webui.openapi.list.filterAll") }, ...tagOptions]} onValueChange={setTagFilter} className={styles.listFilter} />
            </div>}
          >
            <DataTable
              columns={columns}
              rows={rows}
              ariaLabel={t("webui.openapi.list.title")}
              getRowKey={(row) => row.id}
              emptyState={<EmptyState title={t("webui.openapi.list.empty")} />}
            />
          </PageSection>}
      {usable && <PageSection title={t("webui.openapi.schemas.title")} description={t("webui.openapi.schemas.detail")}>
        {modelNames.length === 0
          ? <p className={styles.modelEmpty}>{t("webui.openapi.schemas.empty")}</p>
          : <div className={styles.modelList}>{modelNames.map((name) => (
            <button key={name} type="button" className={styles.modelItem} data-testid="openapi-model-item" onClick={() => openModel(name)}>
              <code className={styles.monoCell}>{name}</code>
            </button>
          ))}</div>}
      </PageSection>}
    </div>
    {selection?.kind === "operation" && (
      <OperationDrawer
        key={selection.row.id}
        row={selection.row}
        schemas={document.components?.schemas}
        mode={mode}
        onModeChange={setMode}
        onClose={closeDrawer}
      />
    )}
    {selection?.kind === "model" && (
      <ModelDrawer name={selection.name} schema={document.components?.schemas?.[selection.name]} onClose={closeDrawer} />
    )}
    <CommandPalette
      open={paletteOpen}
      onClose={() => setPaletteOpen(false)}
      groups={filtered}
      models={modelNames}
      onSelectOperation={(id) => { const row = rowsById.get(id); if (row) openOperation(row, "docs"); }}
      onSelectModel={openModel}
    />
  </div>;
}

function operationColumns(t: Translate, openOperation: (row: OperationRow, mode: "docs" | "debug") => void): ReadonlyArray<DataTableColumn<OperationRow>> {
  return [
    { id: "method", header: t("webui.openapi.table.method"), cell: (row) => <MethodBadge method={row.method} /> },
    { id: "path", header: t("webui.openapi.table.path"), cell: (row) => <code className={styles.monoCell}>{row.path}</code> },
    { id: "operationId", header: t("webui.openapi.table.operation"), cell: (row) => row.operationId },
    { id: "tag", header: t("webui.openapi.table.tag"), cell: (row) => row.tag },
    { id: "actions", header: t("webui.openapi.table.actions"), cell: (row) => (
      <div className={styles.rowActions}>
        <Button size="sm" variant="ghost" onPress={() => openOperation(row, "docs")}>{t("webui.openapi.table.docs")}</Button>
        <Button size="sm" variant="ghost" onPress={() => openOperation(row, "debug")}>{t("webui.openapi.table.debug")}</Button>
      </div>
    ) },
  ];
}