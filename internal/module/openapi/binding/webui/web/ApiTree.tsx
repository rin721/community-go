import { useMemo, useState } from "react";
import { IconButton, SearchControl, TreeView } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { MethodBadge } from "./MethodBadge";
import { filterApiTree, treeNodeCount, type ApiTreeNode } from "./openapi-data";
import styles from "./openapi.module.css";

export function ApiTree({ roots, activeId, collapsed, onToggleCollapsed, onSelect }: {
  roots: ApiTreeNode[];
  activeId?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (row: NonNullable<ApiTreeNode["row"]>) => void;
}) {
  const { t } = useWebUITranslation("webui.openapi");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterApiTree(roots, query), [roots, query]);
  if (collapsed) return <div className={styles.treeRail}><IconButton className={styles.treeRailToggle} onClick={onToggleCollapsed} label={t("webui.openapi.tree.expand")} data={{ "data-testid": "openapi-tree-expand" }}>»</IconButton></div>;

  const selectNode = (id: string) => {
    const node = findNode(filtered, id);
    if (node?.kind === "operation" && node.row) onSelect(node.row);
  };
  return <aside className={styles.treePanel} data-testid="openapi-tree">
    <div className={styles.treeHead}><SearchControl label={t("webui.openapi.tree.search")} className={styles.treeSearch} value={query} onValueChange={setQuery} /><IconButton className={styles.treeRailToggle} onClick={onToggleCollapsed} label={t("webui.openapi.tree.collapse")} data={{ "data-testid": "openapi-tree-collapse" }}>«</IconButton></div>
    <div className={styles.treeScroller}>
      <TreeView nodes={filtered} getChildren={(node) => node.children} getKey={(node) => node.id} selectedId={activeId} onSelect={selectNode} expandAll ariaLabel={t("webui.openapi.tree.label")} renderNode={(node) => node.kind === "operation" && node.row ? <span data-testid="openapi-tree-leaf"><MethodBadge method={node.row.method} /><span className={styles.treeLeafLabel}>{node.row.operationId}</span></span> : <span className={styles.treeGroupLabel}>{node.label}<span className={styles.treeGroupCount}>{treeNodeCount(node)}</span></span>} />
      {filtered.length === 0 && <p className={styles.treeEmpty}>{t("webui.openapi.tree.empty")}</p>}
    </div>
  </aside>;
}

function findNode(nodes: ReadonlyArray<ApiTreeNode>, id: string): ApiTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}
