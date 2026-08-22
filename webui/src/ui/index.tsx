import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type { CapabilityState } from "../contracts";
import { motionDuration } from "../motion";
import { useOverlayOpenPhase } from "../components/shell/overlay";
import { useActionAccess, useZoneContributions, ZoneSlot } from "../sdk/zone";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  const zoneItems = useZoneContributions("page-header");
  return <header className="page-header"><div>{eyebrow && <p className="page-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{(actions || zoneItems.length > 0) && <div className="page-actions">{actions}{zoneItems.map((item) => <ZoneSlot key={item.id} contribution={item} />)}</div>}</header>;
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
  return <div className={`capability-banner capability-${state}`} role="status" aria-live="polite"><div><StatusPill state={state}>{statusLabel}</StatusPill><strong>{title}</strong></div>{detail && <p>{detail}</p>}</div>;
}

export function Skeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return <div className="skeleton-stack" aria-label={label}>{Array.from({ length: lines }, (_, index) => <span key={index} />)}</div>;
}

export function DataToolbar({ filters, actions, ariaLabel }: { filters?: ReactNode; actions?: ReactNode; ariaLabel?: string }) {
  return <div className="data-toolbar" role={ariaLabel ? "toolbar" : undefined} aria-label={ariaLabel}>{filters && <div className="data-toolbar-filters">{filters}</div>}{actions && <div className="data-toolbar-actions">{actions}</div>}</div>;
}

export function FilterPanel({ label, open, onToggle, expandLabel, collapseLabel, children }: { label: string; open: boolean; onToggle: () => void; expandLabel: string; collapseLabel: string; children: ReactNode }) {
  const panelID = `webui-filter-panel-${useId().replaceAll(":", "")}`;
  const toggleID = `${panelID}-toggle`;
  return <section className={`filter-panel ${open ? "open" : ""}`}><button id={toggleID} className="filter-panel-toggle" type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelID} aria-label={open ? collapseLabel : expandLabel}><span className="filter-panel-chevron" aria-hidden="true" />{label}</button>{open && <div id={panelID} className="filter-panel-content" role="region" aria-labelledby={toggleID}>{children}</div>}</section>;
}

export type DataTableColumn<Row> = { id: string; header: ReactNode; cell: (row: Row, index: number) => ReactNode; className?: string; visible?: boolean };

export function getDataTableSelectionState(rowKeys: ReadonlyArray<string>, selected: ReadonlySet<string>): { allSelected: boolean; partiallySelected: boolean } {
  const selectedVisibleCount = rowKeys.filter((key) => selected.has(key)).length;
  const allSelected = rowKeys.length > 0 && selectedVisibleCount === rowKeys.length;
  return { allSelected, partiallySelected: selectedVisibleCount > 0 && !allSelected };
}

type DataTableProps<Row> = {
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
};

export function DataTable<Row>({ columns, rows, ariaLabel, getRowKey = (_row, index) => String(index), loading = false, loadingLabel, emptyState, selectable = false, selectionLabel, selectedKeys, onSelectedKeysChange }: DataTableProps<Row>) {
  const visibleColumns = columns.filter((column) => column.visible !== false);
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
  const columnCount = visibleColumns.length + (selectable ? 1 : 0);
  return <div className="data-table-wrap"><table className="data-table" aria-label={ariaLabel} aria-busy={loading}><thead><tr>{selectable && <th scope="col" className="data-table-selection"><input ref={headerSelectionRef} type="checkbox" checked={allSelected} onChange={toggleAll} aria-checked={partiallySelected ? "mixed" : allSelected} aria-label={selectionLabel} /></th>}{visibleColumns.map((column) => <th scope="col" className={column.className} key={column.id}>{column.header}</th>)}</tr></thead><tbody>{loading && <tr><td colSpan={columnCount}><Skeleton lines={3} label={loadingLabel ?? ""} /></td></tr>}{!loading && rows.length === 0 && <tr><td colSpan={columnCount}>{emptyState}</td></tr>}{!loading && rows.map((row, index) => { const key = getRowKey(row, index); return <tr key={key}>{selectable && <td className="data-table-selection"><input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} aria-label={selectionLabel} /></td>}{visibleColumns.map((column) => <td className={column.className} key={column.id}>{column.cell(row, index)}</td>)}</tr>; })}</tbody></table></div>;
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

export function Pagination({ page, pageCount, total, totalLabel, pageLabel, paginationLabel, previousLabel, nextLabel, onPageChange, pageSize, pageSizeOptions, pageSizeLabel, onPageSizeChange }: { page: number; pageCount: number; total: number; totalLabel: (total: number) => ReactNode; pageLabel: (page: number) => string; paginationLabel?: string; previousLabel: string; nextLabel: string; onPageChange: (page: number) => void; pageSize?: number; pageSizeOptions?: ReadonlyArray<number>; pageSizeLabel?: string; onPageSizeChange?: (pageSize: number) => void }) {
  const current = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  const items = createPaginationItems(current, pageCount);
  return <nav className="pagination" aria-label={paginationLabel ?? pageLabel(current)}><span className="pagination-total">{totalLabel(total)}</span><button type="button" disabled={current <= 1} onClick={() => onPageChange(current - 1)} aria-label={previousLabel}>‹</button>{items.map((item) => item === "ellipsis-left" || item === "ellipsis-right" ? <span className="pagination-ellipsis" aria-hidden="true" key={item}>…</span> : <button type="button" className={item === current ? "active" : ""} onClick={() => onPageChange(item)} aria-current={item === current ? "page" : undefined} aria-label={pageLabel(item)} key={item}>{item}</button>)}<button type="button" disabled={current >= pageCount} onClick={() => onPageChange(current + 1)} aria-label={nextLabel}>›</button>{pageSizeOptions && pageSizeLabel && onPageSizeChange && <select aria-label={pageSizeLabel} value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{pageSizeOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select>}</nav>;
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong>{detail && <p>{detail}</p>}{action}</div>;
}

export function InlineAlert({ tone = "info", title, detail, action }: { tone?: "info" | "success" | "warning" | "danger"; title: string; detail?: string; action?: ReactNode }) {
  return <div className={`inline-alert inline-alert-${tone}`} role="status"><div><strong>{title}</strong>{detail && <p>{detail}</p>}</div>{action && <div className="inline-alert-action">{action}</div>}</div>;
}

export function Toast({ open, tone = "info", title, detail, closeLabel, onClose, action }: { open: boolean; tone?: "info" | "success" | "warning" | "danger"; title: string; detail?: string; closeLabel: string; onClose: () => void; action?: ReactNode }) {
  const { mounted, phase } = useOverlayOpenPhase(open, motionDuration("standard"));
  if (!mounted) return null;
  return <div className={`ui-toast ui-toast-${tone} ${phase === "entering" ? "entering" : phase === "exiting" ? "exiting" : "open"}`} role={tone === "danger" ? "alert" : "status"} aria-live={tone === "danger" ? "assertive" : "polite"}><div className="ui-toast-copy"><strong>{title}</strong>{detail && <p>{detail}</p>}</div><div className="ui-toast-actions">{action}{<button type="button" className="icon-button" onClick={onClose} aria-label={closeLabel}>×</button>}</div></div>;
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, closeLabel, onConfirm, onCancel }: { open: boolean; title: string; description?: string; confirmLabel: string; cancelLabel: string; closeLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleID = `webui-confirm-title-${useId().replaceAll(":", "")}`;
  const descriptionID = `${titleID}-description`;

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("[data-confirm-initial-focus]")?.focus());
    return () => {
      cancelAnimationFrame(focusFrame);
      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      target?.focus();
    };
  }, [open]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])") ?? []);
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      : currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
    event.preventDefault();
    focusable[nextIndex]?.focus();
  };

  return <><button type="button" aria-hidden={!open} aria-label={closeLabel} className={`confirm-backdrop ${open ? "visible" : ""}`} disabled={!open} tabIndex={open ? 0 : -1} onClick={onCancel} /><section ref={dialogRef} className={`confirm-dialog ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!open} aria-labelledby={titleID} aria-describedby={description ? descriptionID : undefined} inert={!open} onKeyDown={handleDialogKeyDown}><header className="confirm-dialog-header"><h2 id={titleID}>{title}</h2><button type="button" className="icon-button" onClick={onCancel} aria-label={closeLabel}>×</button></header>{description && <p id={descriptionID} className="confirm-dialog-description">{description}</p>}<footer className="confirm-dialog-footer"><Button type="button" variant="secondary" onClick={onCancel} data-confirm-initial-focus>{cancelLabel}</Button><Button type="button" variant="danger" onClick={onConfirm}>{confirmLabel}</Button></footer></section></>;
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

// ActionDisabledReason 是触发点禁用原因分类：permission（权限 denied/未投影受限）、
// unavailable（能力不可用）、busy（其他提交进行中）、invalid（表单条件未满足）。
export type ActionDisabledReason = "permission" | "unavailable" | "busy" | "invalid";

// ActionTrigger 是统一动作触发原语：覆盖 idle(hover/focus/active) -> pending ->
// success/failure 交互状态链与权限呈现控制（062 交互规范）。
// - operationId 命中动作级权限钩子：denied 时按 deniedBehavior 隐藏或禁用；
// - onAction 返回 Promise 时自动进入 pending（防重复提交）并在结束/失败后复位；
// - 失败反馈由调用方通过 onError（error code -> message ID）呈现，组件不内联业务文案。
export function ActionTrigger({ operationId, pending = false, pendingLabel, disabledReason, deniedBehavior = "hidden", onAction, onError, variant = "primary", className = "", children, ...buttonProps }: {
  operationId?: string;
  pending?: boolean;
  pendingLabel?: ReactNode;
  disabledReason?: ActionDisabledReason;
  deniedBehavior?: "hidden" | "disabled";
  onAction?: () => Promise<unknown> | void;
  onError?: (error: Error) => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const access = operationId ? useActionAccess(operationId) : undefined;
  const [internalPending, setInternalPending] = useState(false);
  const busy = pending || internalPending;
  const denied = access === "denied";
  const disabled = busy || Boolean(buttonProps.disabled) || Boolean(disabledReason) || (denied && deniedBehavior === "disabled");
  if (denied && deniedBehavior === "hidden") return null;
  const state = busy ? "pending" : disabled ? `disabled-${disabledReason ?? "busy"}` : undefined;
  const handleAction = () => {
    if (busy || disabled) return;
    if (!onAction) return;
    let result: unknown;
    try {
      result = onAction();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("action_failed"));
      return;
    }
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setInternalPending(true);
      (result as Promise<unknown>).catch((error) => onError?.(error instanceof Error ? error : new Error("action_failed"))).finally(() => setInternalPending(false));
    }
  };
  return <button type="button" className={`ui-button ui-button-${variant} ${className}`.trim()} {...buttonProps} disabled={disabled} aria-busy={busy || undefined} aria-disabled={disabled || undefined} data-action-state={state} onClick={handleAction}>{busy && pendingLabel ? pendingLabel : children}</button>;
}

// BulkActionBar 是数据表选择联动后的批量操作条（062 交互规范）：
// 选中 N 项 -> 确认弹窗 -> pending 提交 -> 成功后由调用方复位选择并给出反馈。
export function BulkActionBar({ open, selectionLabel, actionLabel, clearLabel, confirmTitle, confirmDescription, confirmLabel, cancelLabel, closeLabel, pending, pendingLabel, onConfirm, onClear }: {
  open: boolean;
  selectionLabel: string;
  actionLabel: string;
  clearLabel: string;
  confirmTitle: string;
  confirmDescription?: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  pending?: boolean;
  pendingLabel?: string;
  onConfirm: () => Promise<unknown>;
  onClear: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!open) return null;
  return <>
    <div className="bulk-action-bar" role="toolbar">{<span className="bulk-action-count">{selectionLabel}</span>}<Button type="button" variant="secondary" onClick={onClear} disabled={pending}>{clearLabel}</Button><ActionTrigger variant="danger" pending={pending} pendingLabel={pendingLabel} onAction={() => { setConfirmOpen(true); }}>{actionLabel}</ActionTrigger></div>
    <ConfirmDialog open={confirmOpen} title={confirmTitle} description={confirmDescription} confirmLabel={confirmLabel} cancelLabel={cancelLabel} closeLabel={closeLabel} onConfirm={() => { setConfirmOpen(false); void onConfirm(); }} onCancel={() => setConfirmOpen(false)} />
  </>;
}

// FormSubmitActions 是表单提交/重置的统一行为契约：提交支持 pending 与条件禁用，
// 重置为次级动作；表单状态仍由页面 owner 持有（不强制切换表单库）。
export function FormSubmitActions({ submitLabel, resetLabel, submitPending, submitPendingLabel, submitDisabled, submitDisabledReason, resetDisabled, onSubmit, onReset, className = "" }: {
  submitLabel: string;
  resetLabel: string;
  submitPending?: boolean;
  submitPendingLabel?: string;
  submitDisabled?: boolean;
  submitDisabledReason?: ActionDisabledReason;
  resetDisabled?: boolean;
  onSubmit: () => Promise<unknown> | void;
  onReset: () => void;
  className?: string;
}) {
  return <div className={`form-actions ${className}`.trim()}><Button type="button" variant="secondary" onClick={onReset} disabled={resetDisabled || submitPending}>{resetLabel}</Button><ActionTrigger variant="primary" pending={submitPending} pendingLabel={submitPendingLabel} disabled={submitDisabled} disabledReason={submitDisabledReason} onAction={onSubmit}>{submitLabel}</ActionTrigger></div>;
}
