import { Table, Tabs } from '@heroui/react';
import type { Key, ReactNode } from 'react';

export type DataColumn<Row> = Readonly<{
  id: string;
  label: string;
  rowHeader?: boolean;
  render: (row: Row) => ReactNode;
}>;

export type DataTableSelection = Readonly<{
  selectedId?: string;
  onSelectionChange: (id: string) => void;
}>;

export type DataTableProps<Row extends Readonly<{ id: string }>> = Readonly<{
  label: string;
  columns: readonly DataColumn<Row>[];
  rows: readonly Row[];
  emptyContent: ReactNode;
  density?: 'comfortable' | 'compact';
  selection?: DataTableSelection;
}>;

export function DataTable<Row extends Readonly<{ id: string }>>({
  label,
  columns,
  rows,
  emptyContent,
  density = 'comfortable',
  selection,
}: DataTableProps<Row>) {
  const cellSpacing = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3.5';
  return (
    <Table>
      <Table.ScrollContainer className="overflow-auto">
        <Table.Content
          aria-label={label}
          className="min-w-full border-separate border-spacing-0 text-left text-sm"
          {...(selection
            ? {
                selectionMode: 'single' as const,
                selectionBehavior: 'replace' as const,
                disallowEmptySelection: Boolean(selection.selectedId),
                selectedKeys: selection.selectedId ? new Set([selection.selectedId]) : new Set(),
                onSelectionChange: (keys: 'all' | Set<Key>) => {
                  if (keys === 'all') return;
                  const selectedKey = keys.values().next().value;
                  if (selectedKey !== undefined) selection.onSelectionChange(String(selectedKey));
                },
              }
            : {})}
        >
          <Table.Header>
            {columns.map((column) => (
              <Table.Column
                className={`${cellSpacing} sticky top-0 border-b border-border bg-surface-muted text-xs font-bold uppercase tracking-wider text-ink-muted`}
                id={column.id}
                key={column.id}
                {...(column.rowHeader ? { isRowHeader: true } : {})}
              >
                {column.label}
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
