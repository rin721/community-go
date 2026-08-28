import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { Table } from "@heroui/react";
import { MoreHorizontal } from "lucide-react";
import { translateMessage } from "../i18n";
import { Skeleton } from "./feedback";

export type DataTableColumn<Row> = { id: string; header: ReactNode; cell: (row: Row, index: number) => ReactNode; className?: string; visible?: boolean };

export type DataTableEnhancements<Row> = {
  columnVisibility?: { persistedKey?: string; initialVisible?: ReadonlyArray<string> };
  density?: "compact" | "default" | "comfortable";
  stickyHeader?: boolean;
  renderRowMenu?: (row: Row, index: number) => ReadonlyArray<{ key: string; label: ReactNode; onSelect: () => void; danger?: boolean }>;
  rowMenuHeader?: ReactNode;
  columnMenuLabel?: string;
};

export type DataTableProps<Row> = {
  columns: ReadonlyArray<DataTableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  ariaLabel?: string;
  getRowKey?: (row: Row, index: number) => string;
  loading?: boolean;
  loadingLabel?: string;
  emptyState?: ReactNode;
  selectable?: boolean;
  selectionLabel?: string;
  selectedKeys?: ReadonlySet<string>;
  onSelectedKeysChange?: (keys: Set<string>) => void;
  wrapperProps?: HTMLAttributes<HTMLDivElement> & { [key: `data-${string}`]: string | undefined };
  enhancements?: DataTableEnhancements<Row>;
};

export function getDataTableSelectionState(rowKeys: ReadonlyArray<string>, selected: ReadonlySet<string>): { allSelected: boolean; partiallySelected: boolean } {
  const selectedVisibleCount = rowKeys.filter((key) => selected.has(key)).length;
  const allSelected = rowKeys.length > 0 && selectedVisibleCount === rowKeys.length;
  return { allSelected, partiallySelected: selectedVisibleCount > 0 && !allSelected };
}

/** DataTable 将列显隐、密度、粘性表头、批量选择与行菜单收敛为同一数据表契约。 */
export function DataTable<Row>({ columns, rows, ariaLabel, getRowKey = (_row, index) => String(index), loading = false, loadingLabel, emptyState, selectable = false, selectionLabel, selectedKeys, onSelectedKeysChange, wrapperProps, enhancements }: DataTableProps<Row>) {
  const { density = "default", stickyHeader = false, columnVisibility, renderRowMenu, rowMenuHeader, columnMenuLabel } = enhancements ?? {};
  const [hiddenColumns, setHiddenColumns] = useState<ReadonlySet<string>>(() => {
    if (!columnVisibility) return new Set<string>();
    const initial = columnVisibility.initialVisible ?? columns.filter((column) => column.visible !== false).map((column) => column.id);
    if (columnVisibility.persistedKey) {
      try {
        const raw = window.localStorage.getItem(`webui:table:${columnVisibility.persistedKey}:cols`);
        if (raw) return new Set<string>(JSON.parse(raw) as string[]);
      } catch { /* 存储损坏时回退默认列 */ }
    }
    return new Set(columns.map((column) => column.id).filter((id) => !initial.includes(id)));
  });
  const toggleColumn = (id: string) => {
    if (!columnVisibility) return;
    const next = new Set(hiddenColumns);
    next.has(id) ? next.delete(id) : next.add(id);
    setHiddenColumns(next);
    if (columnVisibility.persistedKey) {
      try { window.localStorage.setItem(`webui:table:${columnVisibility.persistedKey}:cols`, JSON.stringify([...next])); } catch { /* 存储不可用不阻断表格 */ }
    }
  };
  const visibleColumns = columns.filter((column) => column.visible !== false && !hiddenColumns.has(column.id));
  const rowKeys = rows.map(getRowKey);
  const selected = selectedKeys ?? new Set<string>();
  const headerSelectionRef = useRef<HTMLInputElement>(null);
  const { allSelected, partiallySelected } = getDataTableSelectionState(rowKeys, selected);
  useEffect(() => {
    if (headerSelectionRef.current) headerSelectionRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);
  const toggleKey = (key: string) => {
    if (!onSelectedKeysChange) return;
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    onSelectedKeysChange(next);
  };
  const toggleAll = () => {
    if (!onSelectedKeysChange) return;
    onSelectedKeysChange(allSelected ? new Set() : new Set(rowKeys));
  };
  const hasColumnMenu = Boolean(columnVisibility) && columns.some((column) => column.visible !== false);
  const hasRowMenu = Boolean(renderRowMenu);
  return <Table.Root className="data-table-wrap" data-density={density} data-sticky={stickyHeader || undefined} {...wrapperProps}>
    {hasColumnMenu && <div className="data-table-toolbar"><details className="data-table-columns" aria-label={columnMenuLabel ?? translateMessage("webui.host.ui.columns")}><summary role="button" tabIndex={0} className="data-table-columns-toggle">{columnMenuLabel ?? translateMessage("webui.host.ui.columns")}</summary><div role="menu" className="data-table-columns-menu">{columns.filter((column) => column.visible !== false).map((column) => <label key={column.id} className="data-table-columns-item" role="menuitemcheckbox" aria-checked={!hiddenColumns.has(column.id)}><input type="checkbox" checked={!hiddenColumns.has(column.id)} onChange={() => toggleColumn(column.id)} />{column.header}</label>)}</div></details></div>}
    <Table.Content className="data-table" aria-label={ariaLabel} aria-busy={loading}>
      <Table.Header>{selectable && <Table.Column id="selection"><input ref={headerSelectionRef} type="checkbox" checked={allSelected} onChange={toggleAll} aria-checked={partiallySelected ? "mixed" : allSelected} aria-label={selectionLabel} /></Table.Column>}{visibleColumns.map((column, index) => <Table.Column id={column.id} className={column.className} isRowHeader={index === 0} key={column.id}>{column.header}</Table.Column>)}{hasRowMenu && <Table.Column id="row-menu" aria-label={columnMenuLabel ?? ""} style={{ width: 104 }}>{rowMenuHeader}</Table.Column>}</Table.Header>
      <Table.Body>
        {loading && <Table.Row>{selectable && <Table.Cell />}{visibleColumns.map((column) => <Table.Cell key={column.id}><Skeleton lines={3} label={loadingLabel ?? ""} /></Table.Cell>)}{hasRowMenu && <Table.Cell />}</Table.Row>}
        {!loading && rows.length === 0 && <Table.Row>{selectable && <Table.Cell />}<Table.Cell>{emptyState}</Table.Cell>{visibleColumns.slice(1).map((column) => <Table.Cell key={column.id} />)}{hasRowMenu && <Table.Cell />}</Table.Row>}
        {!loading && rows.map((row, index) => { const key = getRowKey(row, index); return <Table.Row key={key}>{selectable && <Table.Cell><input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} aria-label={selectionLabel} /></Table.Cell>}{visibleColumns.map((column) => <Table.Cell className={column.className} key={column.id}>{column.cell(row, index)}</Table.Cell>)}{hasRowMenu && <Table.Cell><DataTableRowMenu row={row} index={index} renderRowMenu={renderRowMenu!} /></Table.Cell>}</Table.Row>; })}
      </Table.Body>
    </Table.Content>
  </Table.Root>;
}

/** DataTableRowMenu 只将次要动作收进更多菜单，危险动作不与主动作混淆。 */
export function DataTableRowMenu<Row>({ row, index, renderRowMenu, moreLabel = "…" }: { row: Row; index: number; renderRowMenu: (row: Row, index: number) => ReadonlyArray<{ key: string; label: ReactNode; onSelect: () => void; danger?: boolean }>; moreLabel?: string }) {
  const items = renderRowMenu(row, index);
  if (items.length === 0) return null;
  const primary = items.find((item) => !item.danger);
  const rest = items.filter((item) => item !== primary);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: globalThis.MouseEvent) => { if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) setOpen(false); };
    const closeKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeKey);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", closeKey); };
  }, [open]);
  return <div className="data-table-row-menu">{primary && <button type="button" className="ui-button data-table-row-primary" onClick={primary.onSelect}>{primary.label}</button>}{rest.length > 0 && <><button ref={buttonRef} type="button" className="ui-button data-table-row-more" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((current) => !current)} aria-label={moreLabel}><MoreHorizontal size={15} aria-hidden="true" /></button>{open && <div className="data-table-row-menu-popover" role="menu">{rest.map((item, itemIndex) => <button key={item.key} type="button" role="menuitem" className={`data-table-row-menu-item ${item.danger ? "data-table-row-menu-danger" : ""} ${itemIndex === rest.length - 1 && item.danger ? "data-table-row-menu-border" : ""}`} onClick={() => { setOpen(false); item.onSelect(); }}>{item.label}</button>)}</div>}</>}</div>;
}
