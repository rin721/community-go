import { Table, Tabs } from '@heroui/react';
import type { Key, ReactNode } from 'react';

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
      <Table.ScrollContainer className="overflow-auto">
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

export type TabsViewProps = Readonly<{
  label: string;
  items: readonly TabsViewItem[];
  selectedId?: string;
  onSelectionChange?: (id: string) => void;
}>;

export function TabsView({ label, items, selectedId, onSelectionChange }: TabsViewProps) {
  return (
    <Tabs
      className="w-full"
      disabledKeys={items.filter((item) => item.disabled).map((item) => item.id)}
      onSelectionChange={(key) => onSelectionChange?.(String(key))}
      {...(selectedId ? { selectedKey: selectedId } : {})}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label={label}>
          {items.map((item) => (
            <Tabs.Tab
              className="text-sm font-semibold text-ink-muted data-[selected]:text-brand"
              id={item.id}
              key={item.id}
            >
              {item.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {items.map((item) => (
        <Tabs.Panel className="outline-none" id={item.id} key={item.id}>
          {item.content}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
