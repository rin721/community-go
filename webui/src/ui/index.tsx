import { useEffect, useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type { CapabilityState } from "@webui/contracts";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="page-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

export function Surface({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`surface ${className}`.trim()} {...props} />;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`ui-button ui-button-${variant} ${className}`.trim()} {...props} />;
}

export function Field({ label, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  return <label className="form-field"><span>{label}</span><input className={error ? "field-input field-error" : "field-input"} {...props} />{hint && <small>{hint}</small>}{error && <small className="field-error-message">{error}</small>}</label>;
}

export function StatusPill({ state, children }: { state: CapabilityState; children: ReactNode }) {
  return <span className={`status-pill status-${state}`}><span className="status-dot" />{children}</span>;
}

export function CapabilityBanner({ state, statusLabel, title, detail }: { state: CapabilityState; statusLabel: string; title: string; detail?: string }) {
  return <div className={`capability-banner capability-${state}`}><div><StatusPill state={state}>{statusLabel}</StatusPill><strong>{title}</strong></div>{detail && <p>{detail}</p>}</div>;
}

export function Skeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return <div className="skeleton-stack" aria-label={label}>{Array.from({ length: lines }, (_, index) => <span key={index} />)}</div>;
}

export function DataToolbar({ filters, actions }: { filters?: ReactNode; actions?: ReactNode }) {
  return <div className="data-toolbar">{filters && <div className="data-toolbar-filters">{filters}</div>}{actions && <div className="data-toolbar-actions">{actions}</div>}</div>;
}

export function FilterPanel({ label, open, onToggle, expandLabel, collapseLabel, children }: { label: string; open: boolean; onToggle: () => void; expandLabel: string; collapseLabel: string; children: ReactNode }) {
  return <section className={`filter-panel ${open ? "open" : ""}`}><button className="filter-panel-toggle" type="button" onClick={onToggle} aria-expanded={open} aria-label={open ? collapseLabel : expandLabel}><span className="filter-panel-chevron" aria-hidden="true" />{label}</button>{open && <div className="filter-panel-content">{children}</div>}</section>;
}

export type DataTableColumn<Row> = { id: string; header: ReactNode; cell: (row: Row, index: number) => ReactNode; className?: string };

type DataTableProps<Row> = {
  columns: ReadonlyArray<DataTableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  getRowKey?: (row: Row, index: number) => string;
  loading?: boolean;
  loadingLabel?: string;
  emptyState?: ReactNode;
  selectable?: boolean;
  selectionLabel?: string;
  selectedKeys?: ReadonlySet<string>;
  onSelectedKeysChange?: (keys: Set<string>) => void;
};

export function DataTable<Row>({ columns, rows, getRowKey = (_row, index) => String(index), loading = false, loadingLabel, emptyState, selectable = false, selectionLabel, selectedKeys, onSelectedKeysChange }: DataTableProps<Row>) {
  const rowKeys = rows.map(getRowKey);
  const selected = selectedKeys ?? new Set<string>();
  const allSelected = rowKeys.length > 0 && rowKeys.every((key) => selected.has(key));
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
  const columnCount = columns.length + (selectable ? 1 : 0);
  return <div className="data-table-wrap"><table className="data-table"><thead><tr>{selectable && <th className="data-table-selection"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label={selectionLabel} /></th>}{columns.map((column) => <th className={column.className} key={column.id}>{column.header}</th>)}</tr></thead><tbody>{loading && <tr><td colSpan={columnCount}><Skeleton lines={3} label={loadingLabel ?? ""} /></td></tr>}{!loading && rows.length === 0 && <tr><td colSpan={columnCount}>{emptyState}</td></tr>}{!loading && rows.map((row, index) => { const key = getRowKey(row, index); return <tr key={key}>{selectable && <td className="data-table-selection"><input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} aria-label={selectionLabel} /></td>}{columns.map((column) => <td className={column.className} key={column.id}>{column.cell(row, index)}</td>)}</tr>; })}</tbody></table></div>;
}

export type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

export function createPaginationItems(page: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 1) return pageCount === 1 ? [1] : [];
  const current = Math.min(Math.max(page, 1), pageCount);
  const items: PaginationItem[] = [1];
  if (current > 4) items.push("ellipsis-left");
  for (let value = Math.max(2, current - 1); value <= Math.min(pageCount - 1, current + 1); value += 1) items.push(value);
  if (current < pageCount - 3) items.push("ellipsis-right");
  items.push(pageCount);
  return [...new Set(items)];
}

export function Pagination({ page, pageCount, total, totalLabel, pageLabel, previousLabel, nextLabel, onPageChange, pageSize, pageSizeOptions, pageSizeLabel, onPageSizeChange }: { page: number; pageCount: number; total: number; totalLabel: (total: number) => ReactNode; pageLabel: (page: number) => string; previousLabel: string; nextLabel: string; onPageChange: (page: number) => void; pageSize?: number; pageSizeOptions?: ReadonlyArray<number>; pageSizeLabel?: string; onPageSizeChange?: (pageSize: number) => void }) {
  const current = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  const items = createPaginationItems(current, pageCount);
  return <nav className="pagination" aria-label={pageLabel(current)}><span className="pagination-total">{totalLabel(total)}</span><button type="button" disabled={current <= 1} onClick={() => onPageChange(current - 1)} aria-label={previousLabel}>‹</button>{items.map((item) => item === "ellipsis-left" || item === "ellipsis-right" ? <span className="pagination-ellipsis" aria-hidden="true" key={item}>…</span> : <button type="button" className={item === current ? "active" : ""} onClick={() => onPageChange(item)} aria-current={item === current ? "page" : undefined} aria-label={pageLabel(item)} key={item}>{item}</button>)}<button type="button" disabled={current >= pageCount} onClick={() => onPageChange(current + 1)} aria-label={nextLabel}>›</button>{pageSizeOptions && pageSizeLabel && onPageSizeChange && <select aria-label={pageSizeLabel} value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{pageSizeOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select>}</nav>;
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong>{detail && <p>{detail}</p>}{action}</div>;
}

export function InlineAlert({ tone = "info", title, detail, action }: { tone?: "info" | "success" | "warning" | "danger"; title: string; detail?: string; action?: ReactNode }) {
  return <div className={`inline-alert inline-alert-${tone}`} role="status"><div><strong>{title}</strong>{detail && <p>{detail}</p>}</div>{action && <div className="inline-alert-action">{action}</div>}</div>;
}

export function Drawer({ open, title, description, closeLabel, onClose, children, footer }: { open: boolean; title: string; description?: string; closeLabel: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const drawerRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleID = `webui-drawer-title-${useId().replaceAll(":", "")}`;

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = requestAnimationFrame(() => drawerRef.current?.querySelector<HTMLElement>("[data-drawer-initial-focus]")?.focus());
    return () => {
      cancelAnimationFrame(focusFrame);
      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      target?.focus();
    };
  }, [open]);

  const handleDrawerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])") ?? []);
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      : currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
    event.preventDefault();
    focusable[nextIndex]?.focus();
  };

  return <><button type="button" aria-hidden={!open} aria-label={closeLabel} className={`drawer-backdrop ${open ? "visible" : ""}`} disabled={!open} tabIndex={open ? 0 : -1} onClick={onClose} /><aside ref={drawerRef} className={`ui-drawer ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!open} aria-labelledby={titleID} inert={!open} onKeyDown={handleDrawerKeyDown}><header className="ui-drawer-header"><div><h2 id={titleID}>{title}</h2>{description && <p>{description}</p>}</div><button type="button" data-drawer-initial-focus className="icon-button" onClick={onClose} aria-label={closeLabel}>×</button></header><div className="ui-drawer-content">{children}</div>{footer && <footer className="ui-drawer-footer">{footer}</footer>}</aside></>;
}
