import { useMemo, useState } from "react";
import { Disclosure } from "@heroui/react";
import { Field } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { MethodBadge } from "./MethodBadge";
import { filterApiTree, treeNodeCount, type ApiTreeNode } from "./openapi-data";
import styles from "./openapi.module.css";

// ApiTree is the collapsible left resource area of the openapi workspace
// (R075-009): a search field on top and a recursive tree of group nodes
// (Disclosure-based, unlimited nesting) and operation leaves with the method
// badge. Selecting a leaf opens the operation in the workspace tabs.
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

  if (collapsed) {
    return <div className={styles.treeRail}>
      <button type="button" className={styles.treeRailToggle} onClick={onToggleCollapsed} aria-label={t("webui.openapi.tree.expand")} data-testid="openapi-tree-expand">»</button>
    </div>;
  }

  return <aside className={styles.treePanel} data-testid="openapi-tree">
    <div className={styles.treeHead}>
      <Field label={t("webui.openapi.tree.search")} className={styles.treeSearch} type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button type="button" className={styles.treeRailToggle} onClick={onToggleCollapsed} aria-label={t("webui.openapi.tree.collapse")} data-testid="openapi-tree-collapse">«</button>
    </div>
    <div className={styles.treeScroller} role="tree" aria-label={t("webui.openapi.tree.label")}>
      {filtered.map((node) => <TreeNode key={node.id} node={node} depth={0} activeId={activeId} onSelect={onSelect} />)}
      {filtered.length === 0 && <p className={styles.treeEmpty}>{t("webui.openapi.tree.empty")}</p>}
    </div>
  </aside>;
}

function TreeNode({ node, depth, activeId, onSelect }: {
  node: ApiTreeNode;
  depth: number;
  activeId?: string;
  onSelect: (row: NonNullable<ApiTreeNode["row"]>) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  if (node.kind === "operation") {
    const row = node.row!;
    const active = row.id === activeId;
    return <div className={active ? `${styles.treeLeaf} ${styles.treeLeafActive}` : styles.treeLeaf} role="treeitem" style={{ paddingLeft: `calc(10px + ${depth} * 14px)` }}>
      <button type="button" className={styles.treeLeafButton} onClick={() => onSelect(row)} data-testid="openapi-tree-leaf">
        <MethodBadge method={row.method} />
        <span className={styles.treeLeafLabel}>{row.operationId}</span>
      </button>
    </div>;
  }
  const count = treeNodeCount(node);
  return <div className={styles.treeGroup} role="treeitem" aria-expanded={expanded}>
    <Disclosure.Root isExpanded={expanded} onExpandedChange={setExpanded}>
      <Disclosure.Trigger className={styles.treeGroupTrigger} style={{ paddingLeft: `calc(8px + ${depth} * 14px)` }}>
        <Disclosure.Indicator />
        <span className={styles.treeGroupLabel}>{node.label}</span>
        <span className={styles.treeGroupCount}>{count}</span>
      </Disclosure.Trigger>
      <Disclosure.Content>
        <Disclosure.Body>
          {node.children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} activeId={activeId} onSelect={onSelect} />)}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure.Root>
  </div>;
}