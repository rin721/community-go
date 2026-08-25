import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Chip, Kbd } from "@heroui/react";
import { EmptyState, PageHeader, PageSection } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { webuiOpenAPISpec, webuiOpenAPISpecSourceRevision } from "@webui/generated/openapi-spec";
import { ApiTree } from "./ApiTree";
import { CommandPalette } from "./CommandPalette";
import { ModelPane } from "./ModelPane";
import { OperationPane } from "./OperationPane";
import { ResponsePanel } from "./ResponsePanel";
import { WorkspaceTabs, type WorkspaceTab } from "./WorkspaceTabs";
import {
  filterOperationGroups, groupedOperations, isOpenAPIDocument,
  type OpenAPIDocument,
} from "./openapi-data";
import type { RunState } from "./run-store";
import styles from "./openapi.module.css";

// OpenAPIPage is the Apifox-style workspace shell (R075-005): toolbar with
// breadcrumb and global search, resource tree, multi-tab workspace, operation
// pane with docs/debug modes and the right response panel. The current tab
// deep-links through ?op=&mode= / ?model= so state survives reloads.
export default function OpenAPIPage() {
  const { t } = useWebUITranslation("webui.openapi");
  const usable = isOpenAPIDocument(webuiOpenAPISpec);
  const document = webuiOpenAPISpec as unknown as OpenAPIDocument;
  const allGroups = useMemo(() => (usable ? groupedOperations(document) : []), [usable, document]);
  const rowsById = useMemo(() => new Map(allGroups.flatMap((group) => group.operations).map((row) => [row.id, row])), [allGroups]);
  const models = useMemo(() => Object.keys(document.components?.schemas ?? {}), [document]);
  const [search, setSearch] = useState("");
  const [tabs, setTabs] = useState<WorkspaceTab[]>([{ key: "home", kind: "home", mode: "debug" }]);
  const [activeKey, setActiveKey] = useState("home");
  const [runMap, setRunMap] = useState<Record<string, RunState>>({});
  const [paletteOpen, setPaletteOpen] = useState(false);

  const syncSearch = useCallback((tab: WorkspaceTab | undefined) => {
    const params = new URLSearchParams();
    if (tab?.kind === "operation" && tab.operation) {
      params.set("op", tab.operation.id);
      params.set("mode", tab.mode);
    } else if (tab?.kind === "model" && tab.model) {
      params.set("model", tab.model);
    }
    const next = params.toString();
    window.history.replaceState(null, "", next ? `?${next}` : "/openapi");
  }, []);

  const activateOrOpen = useCallback((tab: WorkspaceTab) => {
    setTabs((current) => (current.some((candidate) => candidate.key === tab.key) ? current : [...current, tab]));
    setActiveKey(tab.key);
    setRunMap((current) => (current[tab.key] ? current : { ...current, [tab.key]: { kind: "idle" } }));
    syncSearch(tab);
  }, [syncSearch]);

  // Deep link: initial load + popstate restore.
  const navigateFromSearch = useCallback((searchString: string) => {
    const params = new URLSearchParams(searchString);
    const op = params.get("op");
    const model = params.get("model");
    const mode = params.get("mode") === "docs" ? "docs" : "debug";
    if (op && rowsById.has(op)) {
      activateOrOpen({ key: `op:${op}`, kind: "operation", operation: rowsById.get(op), mode, model: undefined });
    } else if (model && models.includes(model)) {
      activateOrOpen({ key: `model:${model}`, kind: "model", model, mode: "debug" });
    }
  }, [activateOrOpen, models, rowsById]);

  useEffect(() => {
    navigateFromSearch(window.location.search);
  }, [navigateFromSearch]);

  useEffect(() => {
    const onPopState = () => navigateFromSearch(window.location.search);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigateFromSearch]);

  const openOperation = useCallback((id: string) => {
    const row = rowsById.get(id);
    if (!row) return;
    activateOrOpen({ key: `op:${id}`, kind: "operation", operation: row, mode: "debug" });
  }, [activateOrOpen, rowsById]);

  const openModel = useCallback((name: string) => {
    activateOrOpen({ key: `model:${name}`, kind: "model", model: name, mode: "debug" });
  }, [activateOrOpen]);

  const activateTab = useCallback((key: string) => {
    setActiveKey(key);
    setTabs((current) => {
      syncSearch(current.find((tab) => tab.key === key));
      return current;
    });
  }, [syncSearch]);

  const closeTab = useCallback((key: string) => {
    setTabs((current) => {
      const next = current.filter((tab) => tab.key !== key);
      if (activeKey === key) {
        const fallback = next[next.length - 1] ?? { key: "home", kind: "home" as const, mode: "debug" as const };
        setActiveKey(fallback.key);
        syncSearch(fallback);
      }
      return next;
    });
    setRunMap((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, [activeKey, syncSearch]);

  const setMode = useCallback((key: string, mode: "docs" | "debug") => {
    setTabs((current) => {
      const next = current.map((tab) => (tab.key === key ? { ...tab, mode } : tab));
      syncSearch(next.find((tab) => tab.key === key));
      return next;
    });
  }, [syncSearch]);

  const onRunChange = useCallback((key: string, state: RunState) => {
    setRunMap((current) => ({ ...current, [key]: state }));
  }, []);

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

  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];
  const groups = useMemo(() => filterOperationGroups(allGroups, search), [allGroups, search]);
  const runState: RunState = runMap[activeKey] ?? { kind: "idle" };
  const showResponsePanel = activeTab?.kind === "operation" && activeTab.mode === "debug";
  const activeRow = activeTab?.kind === "operation" ? activeTab.operation : undefined;

  return <div className={`${styles.openapiModule} module-page`}>
    <PageHeader eyebrow={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.title")} description={t("webui.openapi.docs.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.legend.title")} description={t("webui.openapi.docs.legend.detail")}>
        <p className={styles.openapiMeta}>{t("webui.openapi.docs.contract", { title: document.info?.title ?? "", version: document.info?.version ?? "" })}</p>
        <p className={styles.openapiMeta}>{t("webui.openapi.docs.source", { revision: webuiOpenAPISpecSourceRevision })}</p>
      </PageSection>
      {!usable
        ? <EmptyState title={t("webui.openapi.docs.unavailable")} />
        : <div className={styles.workspace}>
          <header className={styles.workspaceToolbar}>
            <nav className={styles.breadcrumb} aria-label={t("webui.openapi.tabs.workspace")}>
              <button type="button" className={styles.breadcrumbItem} onClick={() => activateTab("home")}>{t("webui.openapi.tabs.home")}</button>
              {activeTab?.kind === "operation" && activeTab.operation && (
                <>
                  <span className={styles.breadcrumbSep} aria-hidden="true">/</span>
                  <span className={styles.breadcrumbText}>{activeTab.operation.path}</span>
                  <span className={styles.breadcrumbSep} aria-hidden="true">/</span>
                  <span className={styles.breadcrumbText}>{activeTab.operation.operationId}</span>
                </>
              )}
              {activeTab?.kind === "model" && (
                <>
                  <span className={styles.breadcrumbSep} aria-hidden="true">/</span>
                  <span className={styles.breadcrumbText}>{activeTab.model}</span>
                </>
              )}
            </nav>
            <div className={styles.toolbarActions}>
              <Chip size="sm" variant="soft">{t("webui.openapi.toolbar.env.sameOrigin")}</Chip>
              <Button size="sm" variant="ghost" onPress={() => setPaletteOpen(true)} data-testid="openapi-command">
                {t("webui.openapi.toolbar.command")}<Kbd>⌘K</Kbd>
              </Button>
            </div>
          </header>
          <div className={showResponsePanel ? `${styles.workspaceSplit} ${styles.workspaceSplitPanel}` : styles.workspaceSplit}>
            <aside className={styles.rail}>
              <ApiTree
                groups={groups}
                models={models}
                selectedId={activeTab?.kind === "operation" ? (activeTab.operation?.id ?? null) : null}
                search={search}
                onSearchChange={setSearch}
                onSelectOperation={openOperation}
                onSelectModel={openModel}
              />
            </aside>
            <div className={styles.workspaceMain}>
              <WorkspaceTabs tabs={tabs} activeKey={activeKey} onActivate={activateTab} onClose={closeTab} />
              <div className={styles.tabContent}>
                {activeTab?.kind === "home" && <EmptyState title={t("webui.openapi.tree.selectHint")} />}
                {activeTab?.kind === "model" && activeTab.model && <ModelPane name={activeTab.model} schema={document.components?.schemas?.[activeTab.model]} />}
                {activeTab?.kind === "operation" && activeRow && (
                  <OperationPane
                    key={activeRow.id}
                    row={activeRow}
                    schemas={document.components?.schemas}
                    mode={activeTab.mode}
                    onModeChange={(mode) => setMode(activeKey, mode)}
                    runState={runState}
                    onRunChange={(state) => onRunChange(activeKey, state)}
                  />
                )}
              </div>
            </div>
            {showResponsePanel && <ResponsePanel state={runState} />}
          </div>
        </div>}
    </div>
    <CommandPalette
      open={paletteOpen}
      onClose={() => setPaletteOpen(false)}
      groups={allGroups}
      models={models}
      onSelectOperation={openOperation}
      onSelectModel={openModel}
    />
  </div>;
}