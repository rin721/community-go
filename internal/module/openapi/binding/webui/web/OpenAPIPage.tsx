import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionTrigger, InlineAlert, PageFrame, PageHeader } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { webuiOpenAPISpec, webuiOpenAPISpecSourceRevision } from "@webui/generated/openapi-spec";
import { ApiTree } from "./ApiTree";
import { CommandPalette } from "./CommandPalette";
import { WorkspaceTabs, type WorkspaceTab } from "./WorkspaceTabs";
import { OperationWorkspace } from "./OperationWorkspace";
import { buildApiTree, isOpenAPIDocument, type OpenAPIDocument, type OperationRow } from "./openapi-data";
import styles from "./openapi.module.css";

// CompactWorkspaceSegment is the three-segment navigation segment of the
// compact workspace (090 PAGE-090-007, design §77): compact shows one main
// panel at a time.
export type CompactWorkspaceSegment = "resource" | "request" | "response";

// useCompactWorkspace subscribes to the container-level breakpoint (<768px is
// compact) and returns whether we are compact plus the active segment. The
// selected segment survives segment switches; returning to wide restores the
// desktop split. Test environments (jsdom) without matchMedia keep the wide
// desktop layout.
export function useCompactWorkspace(initial: CompactWorkspaceSegment = "resource") {
  const [isCompact, setIsCompact] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches);
  const [segment, setSegment] = useState<CompactWorkspaceSegment>(initial);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 767px)");
    const handle = (event: MediaQueryListEvent) => setIsCompact(event.matches);
    setIsCompact(media.matches);
    media.addEventListener("change", handle);
    return () => media.removeEventListener("change", handle);
  }, []);
  return { isCompact, segment, setSegment };
}

// OpenAPIPage is the openapi workspace shell (R075-009): the collapsible API
// tree on the left, the multi-operation tab strip on top of the main area and
// the request/response split workspace inside the active tab. The active tab
// deep-links through ?op=&mode= so it survives reloads; the shell browses the
// generated contract snapshot and issues no requests of its own.
export default function OpenAPIPage() {
  const { t } = useWebUITranslation("webui.openapi");
  const usable = isOpenAPIDocument(webuiOpenAPISpec);
  const document = webuiOpenAPISpec as unknown as OpenAPIDocument;
  const roots = useMemo(() => (usable ? buildApiTree(document) : []), [usable, document]);
  const rowsById = useMemo(() => new Map(roots.flatMap((node) => collectRows(node)).map((row) => [row.id, row])), [roots]);
  const initialId = useMemo(() => new URLSearchParams(window.location.search).get("op") ?? "", []);
  const [tabs, setTabs] = useState<WorkspaceTab[]>(initialId && rowsById.has(initialId) ? [{ id: initialId, row: rowsById.get(initialId)! }] : []);
  const [activeId, setActiveId] = useState<string | undefined>(initialId && rowsById.has(initialId) ? initialId : undefined);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const syncSearch = useCallback((id: string | undefined, mode = "docs") => {
    const params = new URLSearchParams();
    if (id) {
      params.set("op", id);
      params.set("mode", mode);
    }
    const next = params.toString();
    window.history.replaceState(null, "", next ? `?${next}` : "/openapi");
  }, []);

  const openOperation = useCallback((row: OperationRow, mode?: "docs" | "debug") => {
    setTabs((current) => (current.some((tab) => tab.id === row.id) ? current : [...current, { id: row.id, row }]));
    setActiveId(row.id);
    syncSearch(row.id, mode ?? "docs");
  }, [syncSearch]);

  const activateTab = useCallback((id: string) => {
    setTabs((current) => {
      const existing = current.find((tab) => tab.id === id);
      if (existing) {
        setActiveId(id);
        syncSearch(id);
        return current;
      }
      const row = rowsById.get(id);
      if (row) return [...current, { id, row }];
      return current;
    });
  }, [rowsById, syncSearch]);

  const closeTab = useCallback((id: string) => {
    setTabs((current) => {
      const next = current.filter((tab) => tab.id !== id);
      if (next.length === 0) {
        setActiveId(undefined);
        syncSearch(undefined);
      } else if (activeId === id) {
        setActiveId(next[0].id);
        syncSearch(next[0].id);
      }
      return next;
    });
  }, [activeId, syncSearch]);

  // Back/forward restores the deep-linked tab.
  useEffect(() => {
    const onPopState = () => {
      const op = new URLSearchParams(window.location.search).get("op");
      if (op && rowsById.has(op)) {
        setTabs((current) => (current.some((tab) => tab.id === op) ? current : [...current, { id: op, row: rowsById.get(op)! }]));
        setActiveId(op);
      } else if (!op) {
        setActiveId(undefined);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [rowsById]);

  // Cmd/Ctrl+K opens quick search.
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

  const activeRow = activeId ? rowsById.get(activeId) : undefined;

  // 090 PAGE-090-007: in compact (<768px) the workspace switches to the
  // three-segment "resources/request/response" navigation showing one main
  // panel at a time; wide restores the resource bar + edit/response split.
  const { isCompact, segment, setSegment } = useCompactWorkspace();

  // 084 OAPI-084-001: on first visit (no deep link) open the first operation so
  // the workspace is never blank; runs once and never re-opens after the user
  // closes all tabs.
  const autoOpenedRef = useRef(false);
  const openFirstOperation = useCallback(() => {
    if (rowsById.size === 0) return;
    const first = rowsById.values().next().value as OperationRow | undefined;
    if (first) openOperation(first);
  }, [rowsById, openOperation]);
  useEffect(() => {
    if (initialId || autoOpenedRef.current || rowsById.size === 0) return;
    autoOpenedRef.current = true;
    openFirstOperation();
  }, [initialId, openFirstOperation, rowsById.size]);

  const segmentSwitcher = isCompact ? (
    <nav className={styles.segmentNav} aria-label={t("webui.openapi.segments.label")}>
      {([
        { id: "resource" as const, label: t("webui.openapi.segments.resource") },
        { id: "request" as const, label: t("webui.openapi.segments.request") },
        { id: "response" as const, label: t("webui.openapi.segments.response") },
      ]).map((item) => (
        <button key={item.id} type="button" className={segment === item.id ? `${styles.segmentButton} ${styles.segmentButtonActive}` : styles.segmentButton} onClick={() => setSegment(item.id)} aria-pressed={segment === item.id}>
          {item.label}
        </button>
      ))}
    </nav>
  ) : null;

  return <PageFrame variant="workbench" className={`${styles.openapiModule} ${styles.workspaceShell}`}>
    <PageHeader eyebrow={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.title")} description={t("webui.openapi.docs.description")} actions={<button type="button" className={styles.shellSearchTrigger} onClick={() => setPaletteOpen(true)}>{t("webui.openapi.palette.title")}</button>} />
    <p className={styles.pageMeta}>{t("webui.openapi.docs.source", { revision: webuiOpenAPISpecSourceRevision })}</p>
    {!usable
      ? <InlineAlert tone="danger" title={t("webui.openapi.docs.unavailable")} />
      : <div className={`${styles.workspaceRow} ${isCompact ? styles.workspaceRowCompact : ""}`}>
        {isCompact
          ? <>
            {segmentSwitcher}
            {segment === "resource" && <ApiTree roots={roots} activeId={activeId} collapsed={false} onToggleCollapsed={() => undefined} onSelect={(row) => { openOperation(row); setSegment("request"); }} />}
            {segment !== "resource" && <div className={styles.workspaceMain}>
              <WorkspaceTabs tabs={tabs} activeId={activeId} onActivate={activateTab} onClose={closeTab} />
              {activeRow
                ? <OperationWorkspace key={activeRow.id} row={activeRow} schemas={document.components?.schemas} compactSegment={segment} />
                : <div className={styles.workspaceEmpty}>
                    <div className={styles.workspaceEmptyContent}>
                      <span className={styles.workspaceEmptyIcon} aria-hidden="true">◫</span>
                      <h3 className={styles.workspaceEmptyTitle}>{t("webui.openapi.workspace.empty.title")}</h3>
                      <p className={styles.workspaceEmptyDetail}>{t("webui.openapi.workspace.empty.detail")}</p>
                      <ActionTrigger variant="secondary" onAction={openFirstOperation}>{t("webui.openapi.workspace.openFirst")}</ActionTrigger>
                    </div>
                  </div>}
            </div>}
          </>
          : <>
          <ApiTree roots={roots} activeId={activeId} collapsed={treeCollapsed} onToggleCollapsed={() => setTreeCollapsed((value) => !value)} onSelect={openOperation} />
          <div className={styles.workspaceMain}>
            <WorkspaceTabs tabs={tabs} activeId={activeId} onActivate={activateTab} onClose={closeTab} />
            {activeRow
              ? <OperationWorkspace key={activeRow.id} row={activeRow} schemas={document.components?.schemas} />
              : <div className={styles.workspaceEmpty}>
                  <div className={styles.workspaceEmptyContent}>
                    <span className={styles.workspaceEmptyIcon} aria-hidden="true">◫</span>
                    <h3 className={styles.workspaceEmptyTitle}>{t("webui.openapi.workspace.empty.title")}</h3>
                    <p className={styles.workspaceEmptyDetail}>{t("webui.openapi.workspace.empty.detail")}</p>
                    <ActionTrigger variant="secondary" onAction={openFirstOperation}>{t("webui.openapi.workspace.openFirst")}</ActionTrigger>
                  </div>
                </div>}
          </div>
          </>}
      </div>}
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} groups={groupedOperationsForPalette(roots)} models={Object.keys(document.components?.schemas ?? {})} onSelectOperation={(id) => { const row = rowsById.get(id); if (row) openOperation(row, "docs"); }} onSelectModel={() => undefined} />
  </PageFrame>;
}

// collectRows flattens the tree to operation rows (stable pre-order).
function collectRows(node: import("./openapi-data").ApiTreeNode): OperationRow[] {
  if (node.kind === "operation") return node.row ? [node.row] : [];
  return node.children.flatMap(collectRows);
}

// groupedOperationsForPalette adapts the tree into the operation groups the
// palette consumes (flattened to current tag-contract groups).
function groupedOperationsForPalette(roots: import("./openapi-data").ApiTreeNode[]): Array<{ tag: string; operations: OperationRow[] }> {
  const groups: Array<{ tag: string; operations: OperationRow[] }> = [];
  const walk = (nodes: import("./openapi-data").ApiTreeNode[], prefix: string[]) => {
    for (const node of nodes) {
      if (node.kind === "group") {
        walk(node.children, [...prefix, node.label]);
      } else if (node.row) {
        const tag = prefix.join(".") || "default";
        const group = groups.find((candidate) => candidate.tag === tag);
        if (group) group.operations.push(node.row);
        else groups.push({ tag, operations: [node.row] });
      }
    }
  };
  walk(roots, []);
  return groups;
}
