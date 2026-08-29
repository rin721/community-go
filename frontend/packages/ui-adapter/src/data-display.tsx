import { Table, Tabs } from '@heroui/react';
import type { ReactNode } from 'react';

export type DataColumn<Row> = Readonly<{
  id: string;
  label: string;
  rowHeader?: boolean;
  render: (row: Row) => ReactNode;
}>;

export type DataTableProps<Row extends Readonly<{ id: string }>> = Readonly<{
  label: string;
  columns: readonly DataColumn<Row>[];
  rows: readonly Row[];
  density?: 'comfortable' | 'compact';
  selectedId?: string;
  onRowAction?: (id: string) => void;
}>;

export function DataTable<Row extends Readonly<{ id: string }>>({
  label,
  columns,
  rows,
  density = 'comfortable',
  selectedId,
  onRowAction,
}: DataTableProps<Row>) {
  const cellSpacing = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3.5';
  return (
    <Table aria-label={label}>
      <Table.ScrollContainer className="overflow-auto">
        <Table.Content
          aria-label={label}
          className="min-w-full border-separate border-spacing-0 text-left text-sm"
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
          <Table.Body>
            {rows.map((row) => (
              <Table.Row
                className={`cursor-default outline-none transition-colors hover:bg-surface-muted data-[focus-visible]:bg-brand-soft ${selectedId === row.id ? 'bg-brand-soft' : ''}`}
                id={row.id}
                key={row.id}
                onAction={() => onRowAction?.(row.id)}
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
      <Tabs.ListContainer className="overflow-x-auto border-b border-border">
        <Tabs.List aria-label={label} className="flex min-w-full gap-1">
          {items.map((item) => (
            <Tabs.Tab
              className="relative min-h-11 min-w-max flex-1 whitespace-nowrap px-3 text-sm font-semibold text-ink-muted outline-none data-[hovered]:text-ink data-[selected]:text-brand"
              id={item.id}
              key={item.id}
            >
              {item.label}
              <Tabs.Indicator className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />
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
