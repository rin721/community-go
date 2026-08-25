import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Field, InlineAlert, PageHeader, PageSection } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { webuiOpenAPISpec, webuiOpenAPISpecSourceRevision } from "@webui/generated/openapi-spec";
import { MethodBadge } from "./MethodBadge";
import { OperationDetail } from "./OperationDetail";
import { SchemasView } from "./SchemasView";
import {
  filterOperationGroups, groupedOperations, isOpenAPIDocument,
  type OpenAPIDocument, type OperationRow,
} from "./openapi-data";
import styles from "./openapi.module.css";

type WorkspaceView = "operations" | "schemas";

function parseView(search: string): WorkspaceView {
  return new URLSearchParams(search).get("view") === "schemas" ? "schemas" : "operations";
}

function parseOperation(search: string): string | null {
  return new URLSearchParams(search).get("op");
}

function workspaceSearch(view: WorkspaceView, operation: string | null): string {
  const params = new URLSearchParams();
  params.set("view", view);
  if (operation) params.set("op", operation);
  return `?${params.toString()}`;
}

// OpenAPIPage is the Apifox-style workspace (R075-004): a left rail with a
// searchable operation tree (or the schema model list) and a main area showing
// the selected operation (with the executor) or the selected model. The
// current view deep-links through ?view=&op= so the state survives reloads.
export default function OpenAPIPage() {
  const { t } = useWebUITranslation("webui.openapi");
  const usable = isOpenAPIDocument(webuiOpenAPISpec);
  const document = webuiOpenAPISpec as unknown as OpenAPIDocument;
  const allGroups = useMemo(() => (usable ? groupedOperations(document) : []), [usable, document]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<WorkspaceView>(() => parseView(window.location.search));
  const [selectedId, setSelectedId] = useState<string | null>(() => parseOperation(window.location.search));

  useEffect(() => {
    const onPopState = () => {
      setView(parseView(window.location.search));
      setSelectedId(parseOperation(window.location.search));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectView = useCallback((next: WorkspaceView) => {
    setView(next);
    window.history.replaceState(null, "", workspaceSearch(next, next === "operations" ? selectedId : null));
  }, [selectedId]);

  const selectOperation = useCallback((id: string) => {
    setSelectedId(id);
    setView("operations");
    window.history.replaceState(null, "", workspaceSearch("operations", id));
  }, []);

  const groups = useMemo(() => filterOperationGroups(allGroups, search), [allGroups, search]);
  const selectedRow: OperationRow | undefined = useMemo(
    () => (selectedId ? allGroups.flatMap((group) => group.operations).find((row) => row.id === selectedId) : undefined),
    [allGroups, selectedId],
  );
  const schemas = document.components?.schemas ?? {};

  return <div className={`${styles.openapiModule} module-page`}>
    <PageHeader eyebrow={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.title")} description={t("webui.openapi.docs.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.legend.title")} description={t("webui.openapi.docs.legend.detail")}>
        <p className={styles.openapiMeta}>{t("webui.openapi.docs.contract", { title: document.info?.title ?? "", version: document.info?.version ?? "" })}</p>
        <p className={styles.openapiMeta}>{t("webui.openapi.docs.source", { revision: webuiOpenAPISpecSourceRevision })}</p>
      </PageSection>
      {!usable
        ? <InlineAlert tone="danger" title={t("webui.openapi.docs.unavailable")} />
        : <div className={styles.workspace}>
          <aside className={styles.rail}>
            <div className={styles.railTabs}>
              <Button variant={view === "operations" ? "primary" : "ghost"} className={styles.railTab} onClick={() => selectView("operations")}>{t("webui.openapi.views.operations")}</Button>
              <Button variant={view === "schemas" ? "primary" : "ghost"} className={styles.railTab} onClick={() => selectView("schemas")}>{t("webui.openapi.views.schemas")}</Button>
            </div>
            {view === "operations"
              ? <>
                <Field
                  className={styles.treeSearch}
                  label={t("webui.openapi.tree.search")}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <nav className={styles.operationTree} aria-label={t("webui.openapi.views.operations")}>
                  {groups.map((group) => (
                    <section key={group.tag} className={styles.treeGroup}>
                      <h3 className={styles.treeGroupTitle}>{group.tag}</h3>
                      {group.operations.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className={styles.treeItem}
                          data-testid="openapi-tree-item"
                          aria-current={selectedId === row.id ? "true" : undefined}
                          onClick={() => selectOperation(row.id)}
                        >
                          <MethodBadge method={row.method} />
                          <span className={styles.treeItemLabel}>{row.operationId}</span>
                        </button>
                      ))}
                    </section>
                  ))}
                  {groups.length === 0 && <p className={styles.treeEmpty}>{t("webui.openapi.tree.empty")}</p>}
                </nav>
              </>
              : null}
          </aside>
          <main className={styles.workspaceMain}>
            {view === "schemas"
              ? <SchemasView schemas={schemas} />
              : selectedRow
                ? <OperationDetail key={selectedRow.id} row={selectedRow} schemas={schemas} />
                : <EmptyState title={t("webui.openapi.tree.selectHint")} />}
          </main>
        </div>}
    </div>
  </div>;
}