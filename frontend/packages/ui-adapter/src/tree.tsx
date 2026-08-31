import {
  Tree as AriaTree,
  TreeItem as AriaTreeItem,
  TreeItemContent,
  type Key,
  type Selection,
} from 'react-aria-components/Tree';
import { Button } from 'react-aria-components/Button';

export type TreeNode = Readonly<{
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  children?: readonly TreeNode[];
}>;

export type TreeProps = Readonly<{
  label: string;
  nodes: readonly TreeNode[];
  selectionMode?: 'none' | 'single' | 'multiple';
  selectedIds?: ReadonlySet<string>;
  defaultExpandedIds?: ReadonlySet<string>;
  expandLabel: (nodeLabel: string) => string;
  collapseLabel: (nodeLabel: string) => string;
  onSelectionChange?: (ids: ReadonlySet<string>) => void;
  onAction?: (id: string) => void;
}>;

function renderTreeItem(
  node: TreeNode,
  expandLabel: (nodeLabel: string) => string,
  collapseLabel: (nodeLabel: string) => string,
  onAction?: (id: string) => void,
) {
  return (
    <AriaTreeItem
      id={node.id}
      key={node.id}
      textValue={node.label}
      {...(node.disabled === undefined ? {} : { isDisabled: node.disabled })}
      {...(onAction ? { onAction: () => onAction(node.id) } : {})}
    >
      <TreeItemContent>
        {({ hasChildItems, isExpanded, isFocusVisible, isSelected, level }) => (
          <div
            className={`flex min-h-control items-center gap-2 rounded-control px-2 outline-none ${
              isSelected ? 'bg-brand-soft text-brand-strong' : 'text-ink hover:bg-surface-muted'
            } ${isFocusVisible ? 'ring-2 ring-focus' : ''}`}
            style={{
              paddingInlineStart: `calc(${level - 1} * var(--spacing-6) + var(--spacing-2))`,
            }}
          >
            {hasChildItems ? (
              <Button
                aria-label={isExpanded ? collapseLabel(node.label) : expandLabel(node.label)}
                className={`grid size-icon-sm shrink-0 place-items-center rounded-control text-ink-muted outline-none transition-transform hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                slot="chevron"
              >
                <span aria-hidden="true">›</span>
              </Button>
            ) : (
              <span aria-hidden="true" className="grid size-icon-sm shrink-0 place-items-center">
                •
              </span>
            )}
            <span className="min-w-0 py-1">
              <span className="block truncate text-sm font-medium">{node.label}</span>
              {node.description ? (
                <span className="block truncate text-xs text-ink-muted">{node.description}</span>
              ) : null}
            </span>
          </div>
        )}
      </TreeItemContent>
      {node.children?.map((child) => renderTreeItem(child, expandLabel, collapseLabel, onAction))}
    </AriaTreeItem>
  );
}

function normalizeSelection(selection: Selection): ReadonlySet<string> {
  if (selection === 'all') {
    return new Set<string>();
  }
  return new Set(Array.from(selection, (key) => String(key)));
}

/** Tree 统一层级数据的键盘导航、展开和选择语义。 */
export function Tree({
  label,
  nodes,
  expandLabel,
  collapseLabel,
  selectionMode = 'none',
  selectedIds,
  defaultExpandedIds,
  onSelectionChange,
  onAction,
}: TreeProps) {
  const selectedKeys = selectedIds ? new Set<Key>(selectedIds) : undefined;
  const defaultExpandedKeys = defaultExpandedIds ? new Set<Key>(defaultExpandedIds) : undefined;

  return (
    <AriaTree
      aria-label={label}
      className="rounded-panel border border-border bg-surface p-2 outline-none focus-visible:ring-2 focus-visible:ring-focus"
      selectionMode={selectionMode}
      {...(defaultExpandedKeys ? { defaultExpandedKeys } : {})}
      {...(onSelectionChange
        ? {
            onSelectionChange: (selection: Selection) =>
              onSelectionChange(normalizeSelection(selection)),
          }
        : {})}
      {...(selectedKeys ? { selectedKeys } : {})}
    >
      {nodes.map((node) => renderTreeItem(node, expandLabel, collapseLabel, onAction))}
    </AriaTree>
  );
}
