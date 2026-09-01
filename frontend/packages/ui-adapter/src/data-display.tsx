import { Table } from '@heroui/react/table';
import { Tabs } from '@heroui/react/tabs';
import { startTransition, useState, type Key, type ReactNode } from 'react';

import { ContentSwapTransition } from './content-swap-transition';

export type DataColumn<Row> = Readonly<{
  id: string;
  label: string;
  rowHeader?: boolean;
  sortable?: boolean;
  render: (row: Row) => ReactNode;
}>;

export type DataTableSingleSelection = Readonly<{
  mode?: 'single';
  selectedId?: string;
  onSelectionChange: (id: string) => void;
}>;

export type DataTableMultiSelection = Readonly<{
  mode: 'multiple';
  selectedIds: readonly string[];
  onSelectionChange: (ids: readonly string[]) => void;
}>;

export type DataTableSelection = DataTableSingleSelection | DataTableMultiSelection;

export type DataTableSort = Readonly<{
  columnId: string;
  direction: 'ascending' | 'descending';
  onSortChange: (columnId: string, direction: 'ascending' | 'descending') => void;
}>;

export type DataTableProps<Row extends Readonly<{ id: string }>> = Readonly<{
  label: string;
  columns: readonly DataColumn<Row>[];
  rows: readonly Row[];
  emptyContent: ReactNode;
  density?: 'comfortable' | 'compact';
  selection?: DataTableSelection;
  sort?: DataTableSort;
}>;

export function DataTable<Row extends Readonly<{ id: string }>>({
  label,
  columns,
  rows,
  emptyContent,
  density = 'comfortable',
  selection,
  sort,
}: DataTableProps<Row>) {
  const cellSpacing = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3.5';
  const selectedIds = selection
    ? selection.mode === 'multiple'
      ? selection.selectedIds
      : selection.selectedId
        ? [selection.selectedId]
        : []
    : [];
  return (
    <Table>
      <Table.ScrollContainer className="overflow-auto" data-table-scroll-container>
        <Table.Content
          aria-label={label}
          className="min-w-full border-separate border-spacing-0 text-left text-sm"
          {...(selection
            ? {
                selectionMode:
                  selection.mode === 'multiple' ? ('multiple' as const) : ('single' as const),
                selectionBehavior:
                  selection.mode === 'multiple' ? ('toggle' as const) : ('replace' as const),
                disallowEmptySelection:
                  selection.mode !== 'multiple' && Boolean(selection.selectedId),
                selectedKeys: new Set(selectedIds),
                onSelectionChange: (keys: 'all' | Set<Key>) => {
                  if (selection.mode === 'multiple') {
                    selection.onSelectionChange(
                      keys === 'all' ? rows.map((row) => row.id) : [...keys].map(String),
                    );
                    return;
                  }
                  if (keys === 'all') return;
                  const selectedKey = keys.values().next().value;
                  if (selectedKey !== undefined) selection.onSelectionChange(String(selectedKey));
                },
              }
            : {})}
          {...(sort
            ? {
                sortDescriptor: { column: sort.columnId, direction: sort.direction },
                onSortChange: (descriptor: {
                  column: Key;
                  direction: 'ascending' | 'descending';
                }) => sort.onSortChange(String(descriptor.column), descriptor.direction),
              }
            : {})}
        >
          <Table.Header>
            {columns.map((column) => (
              <Table.Column
                className={`${cellSpacing} sticky top-0 border-b border-border bg-surface-muted text-xs font-bold uppercase tracking-wider text-ink-muted`}
                id={column.id}
                key={column.id}
                {...(column.sortable ? { allowsSorting: true } : {})}
                {...(column.rowHeader ? { isRowHeader: true } : {})}
              >
                {({ sortDirection }) => (
                  <Table.SortableColumnHeader {...(sortDirection ? { sortDirection } : {})}>
                    {column.label}
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (
              <div className="px-4 py-10 text-center text-sm text-ink-muted">{emptyContent}</div>
            )}
          >
            {rows.map((row) => (
              <Table.Row
                className={selection ? 'cursor-pointer' : 'cursor-default'}
                id={row.id}
                key={row.id}
              >
                {columns.map((column) => (
                  <Table.Cell
                    className={`${cellSpacing} border-b border-border align-middle text-ink`}
                    key={column.id}
                  >
                    {column.render(row)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export type TabsViewItem = Readonly<{
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}>;

/**
 * TabsView 的稳定语义 Variant：
 * - `line`（默认）：轻量同级导航。重点通过 active indicator 表达当前项，
 *   不引入容器感，适合 Showcase、状态切换等轻量展示。
 * - `section`：Card / Form / Settings 等内容分区。TabList 使用浅色 surface
 *   与受控内容形成所属关系，选中仍由 indicator + 语义前景色表达，
 *   不依赖全宽 divider 建立层级。
 * 两种 Variant 共享同一状态模型（Active/Inactive/Hover/Focus/Disabled/Keyboard）
 * 与 Semantic Token；仅视觉容器与 indicator 表达不同。
 */
export type TabsViewVariant = 'line' | 'section';

export type TabsViewProps = Readonly<{
  label: string;
  items: readonly TabsViewItem[];
  selectedId?: string;
  onSelectionChange?: (id: string) => void;
  variant?: TabsViewVariant;
}>;

const tabsVariantClass = {
  line: {
    list: 'flex w-full max-w-full gap-1 overflow-x-auto border-b border-border px-4',
    panel: 'mt-3 outline-none',
  },
  section: {
    list: 'flex w-full max-w-full gap-1 overflow-x-auto rounded-t-panel bg-surface-muted px-4 pt-2',
    panel: 'mt-0 outline-none',
  },
} as const;

/** Tab trigger 状态样式：两种 Variant 共用，保证状态模型一致。 */
const tabStateClass =
  'w-auto shrink-0 border-b-2 border-transparent px-4 py-2.5 -mb-px text-sm font-medium text-ink-muted outline-none transition-colors hover:text-ink data-[selected]:border-brand data-[selected]:font-semibold data-[selected]:text-brand';

export function TabsView({
  label,
  items,
  selectedId,
  onSelectionChange,
  variant = 'line',
}: TabsViewProps) {
  const firstEnabledId = items.find((item) => !item.disabled)?.id ?? '';
  const [internalSelectedId, setInternalSelectedId] = useState(firstEnabledId);
  const resolvedSelectedId = selectedId ?? internalSelectedId;
  const variantClass = tabsVariantClass[variant];

  return (
    <Tabs
      className="w-full"
      disabledKeys={items.filter((item) => item.disabled).map((item) => item.id)}
      keyboardActivation="automatic"
      onSelectionChange={(key) => {
        const nextId = String(key);
        startTransition(() => {
          if (selectedId === undefined) setInternalSelectedId(nextId);
          onSelectionChange?.(nextId);
        });
      }}
      selectedKey={resolvedSelectedId}
    >
      <Tabs.List aria-label={label} className={variantClass.list}>
        {items.map((item) => (
          <Tabs.Tab className={tabStateClass} id={item.id} key={item.id}>
            {item.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {items.map((item) => (
        <Tabs.Panel className={variantClass.panel} id={item.id} key={item.id}>
          <ContentSwapTransition contentKey={resolvedSelectedId}>
            {item.content}
          </ContentSwapTransition>
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
