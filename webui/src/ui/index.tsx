import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Checkbox as RACCheckbox, Dialog as RACDialog, Modal as RACModal, Switch as RACSwitch } from "react-aria-components";
import { Alert, Button as HeroButton, Card, Chip, Description, EmptyState as HeroEmptyState, FieldError, Input as HeroInput, Label, ListBox, Pagination as HeroPagination, Select, Skeleton as HeroSkeleton, Table, TextField, Typography } from "@heroui/react";
import { ToastProvider, addToast, closeToast } from "@heroui/toast";
import type { CapabilityState } from "../contracts";
import { Reveal } from "../motion/reveal";
import { useActionAccess, useZoneContributions, ZoneSlot } from "../sdk/zone";
import { Sparkline } from "./charts";
export { Reveal, RevealList, revealRhythms, revealStaggerStep } from "../motion/reveal";
export type { RevealProps, RevealRhythm } from "../motion/reveal";
export { ToastProvider };
export { Sparkline, LineChart, AxisLineChart } from "./charts";
export type { ChartSeries } from "./charts";

// 083 PAGE-083-002：统一时间戳人类可读化（RFC3339 -> 本地 YYYY-MM-DD HH:mm），
// 非法输入回退原字符串；供列表/详情跨模块复用（审计、会话、Ops 等）。
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** formatRelativeTime 将时间戳转换为低噪声相对时间；调用方提供 locale 文案和测试用 now。 */
export function formatRelativeTime(iso: string | undefined | null, t: (key: string, params?: Record<string, number>) => string, now = Date.now()): string {
  if (!iso) return "—";
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return iso;
  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (elapsedSeconds < 60) return t("webui.host.relative.justNow");
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return t("webui.host.relative.minutes", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("webui.host.relative.hours", { hours });
  return t("webui.host.relative.days", { days: Math.floor(hours / 24) });
}

function alertStatus(state: CapabilityState): "default" | "success" | "warning" | "danger" | "accent" {
  switch (state) {
    case "available": return "success";
    case "degraded": return "warning";
    case "unavailable": return "danger";
    default: return "accent";
  }
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  const zoneItems = useZoneContributions("page-header");
  return <header className="page-header"><div>{eyebrow && <p className="page-eyebrow">{eyebrow}</p>}<Typography.Heading level={1} className="page-header-title">{title}</Typography.Heading>{description && <p className="page-description">{description}</p>}</div>{(actions || zoneItems.length > 0) && <div className="page-actions">{actions}{zoneItems.map((item) => <ZoneSlot key={item.id} contribution={item} />)}</div>}</header>;
}

// Surface 保持平台语义容器（.surface 样式 authority），后续可整体切换 HeroUI Surface。
export function Surface({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`surface ${className}`.trim()} {...props} />;
}

// Button 映射到 HeroUI Button：primary/secondary/ghost/danger。
export function Button({ variant = "primary", className = "", type = "button", disabled, onClick, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const heroVariant = variant === "ghost" ? "ghost" : variant === "danger" ? "danger" : variant === "secondary" ? "outline" : "primary";
  return <HeroButton type={type} variant={heroVariant} size="md" isDisabled={disabled} onPress={() => onClick?.(undefined as unknown as React.MouseEvent<HTMLButtonElement>)} className={`ui-button ui-button-${variant} ${className}`.trim()} {...props as object}>{children}</HeroButton>;
}

// Field 复用 HeroUI TextField/Input 复合组件（RAC 底座）：Label/Description/FieldError
// 语义 + 原生 input 事件透传（onChange(event) 契约不变）。
// 082 REQ-082-003：规范化 FormField 结构（Label/Description/Control/Helper/Error），
// 新增 description/width（240/320-480/480-640 档）与 optional 标记，placeholder 不替代 label。
export type FieldWidth = "sm" | "md" | "lg" | "auto";
export function fieldWidthClass(width: FieldWidth = "auto"): string {
  return width === "sm" ? "field-width-sm" : width === "md" ? "field-width-md" : width === "lg" ? "field-width-lg" : "";
}
export function Field({ label, hint, error, className = "", description, width = "auto", optional, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; description?: string; width?: FieldWidth; optional?: boolean }) {
  return <div className={`form-field ${error ? "has-error" : ""} ${fieldWidthClass(width)}`.trim()}><TextField isInvalid={Boolean(error)}><Label>{label}{optional && <span className="form-field-optional">（可选）</span>}</Label><HeroInput className={className} {...props as object} />{hint && <Description>{hint}</Description>}{description && !hint && <Description>{description}</Description>}{error && <FieldError>{error}</FieldError>}</TextField></div>;
}

// FormField：通用字段容器（Label/Description/Control/Helper/Error 统一结构，082 REQ-082-003）。
// 相比 Field 支持任意 control 子节点（Select/Check/Switch/自定义），供 RHF Controller 包裹。
export function FormField({ label, control, description, helper, error, width = "auto", optional, htmlFor }: {
  label: ReactNode;
  control: ReactNode;
  description?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  width?: FieldWidth;
  optional?: boolean;
  htmlFor?: string;
}) {
  return (
    <div className={`form-field ${error ? "has-error" : ""} ${fieldWidthClass(width)}`.trim()}>
      <label className="form-field-label" htmlFor={htmlFor}>{label}{optional && <span className="form-field-optional">（可选）</span>}</label>
      {control}
      {description && <p className="form-field-description">{description}</p>}
      {helper && <p className="form-field-helper">{helper}</p>}
      {error && <p className="form-field-error" role="alert">{error}</p>}
    </div>
  );
}

export function StatusPill({ state, children }: { state: CapabilityState; children: ReactNode }) {
  const semanticState: SemanticStatus = state === "available" ? "healthy" : state === "degraded" ? "degraded" : state === "unavailable" ? "failed" : "pending";
  return <StatusBadge status={semanticState} className={`status-pill status-${state}`}>{children}</StatusBadge>;
}

export function CapabilityBanner({ state, statusLabel, title, detail }: { state: CapabilityState; statusLabel: string; title: string; detail?: string }) {
  return <Alert status={alertStatus(state)} className={`capability-banner capability-${state}`} role="status" aria-live="polite"><Alert.Content><Alert.Title>{statusLabel}</Alert.Title><Alert.Description><strong>{title}</strong>{detail && <> · {detail}</>}</Alert.Description></Alert.Content></Alert>;
}

// Skeleton 复用 HeroUI Skeleton 的行几何占位。
export function Skeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return <div className="skeleton-stack" aria-label={label}>{Array.from({ length: lines }, (_, index) => <HeroSkeleton className="h-2.5 rounded-full" key={index} />)}</div>;
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
  /** wrapperProps 透传给 .data-table-wrap，供声明 data-* 滚动行为（067 显式滚动劫持）。 */
  wrapperProps?: HTMLAttributes<HTMLDivElement> & { [key: `data-${string}`]: string | undefined };
  /** 082 REQ-082-001 DataTable 增强（全部可选，默认关闭，保持既有调用兼容）。 */
  enhancements?: DataTableEnhancements<Row>;
};

/** 082 REQ-082-001：DataTable 增强配置——列显隐 / 密度 / Sticky 表头 / 行操作菜单。 */
export type DataTableEnhancements<Row> = {
  /** 列显隐：initialVisible 缺省为 columns 的 visible !== false；persistedKey 提供时存 localStorage。 */
  columnVisibility?: { persistedKey?: string; initialVisible?: ReadonlyArray<string> };
  /** 行密度：可选三档，落 data-density 属性。 */
  density?: "compact" | "default" | "comfortable";
  /** 粘性表头：需要容器 max-height 配合（配合 wrapperProps 的滚动容器）。 */
  stickyHeader?: boolean;
  /** 行操作菜单：renderRowMenu 返回菜单项（仅渲染真实 operation；空数组不渲染菜单列）。 */
  renderRowMenu?: (row: Row, index: number) => ReadonlyArray<{ key: string; label: ReactNode; onSelect: () => void; danger?: boolean }>;
  /** 列显隐菜单的 a11y 文案。 */
  columnMenuLabel?: string;
};

export function DataTable<Row>({ columns, rows, ariaLabel, getRowKey = (_row, index) => String(index), loading = false, loadingLabel, emptyState, selectable = false, selectionLabel, selectedKeys, onSelectedKeysChange, wrapperProps, enhancements }: DataTableProps<Row>) {
  const { density = "default", stickyHeader = false, columnVisibility, renderRowMenu, columnMenuLabel } = enhancements ?? {};
  // 列显隐：受控于 localStorage（persistedKey）或 initialVisible；被隐藏的列通过菜单恢复。
  const [hiddenColumns, setHiddenColumns] = useState<ReadonlySet<string>>(() => {
    if (!columnVisibility) return new Set<string>();
    const initial = columnVisibility.initialVisible ?? columns.filter((column) => column.visible !== false).map((column) => column.id);
    if (columnVisibility.persistedKey) {
      try {
        const raw = window.localStorage.getItem(`webui:table:${columnVisibility.persistedKey}:cols`);
        if (raw) return new Set<string>(JSON.parse(raw) as string[]);
      } catch { /* 解析失败回退初始值 */ }
    }
    return new Set(columns.map((column) => column.id).filter((id) => !initial.includes(id)));
  });
  const toggleColumn = (id: string) => {
    if (!columnVisibility) return;
    const next = new Set(hiddenColumns);
    next.has(id) ? next.delete(id) : next.add(id);
    setHiddenColumns(next);
    if (columnVisibility.persistedKey) {
      try { window.localStorage.setItem(`webui:table:${columnVisibility.persistedKey}:cols`, JSON.stringify([...next])); } catch { /* 存储不可用时静默 */ }
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
  return (
    <Table.Root className="data-table-wrap" data-density={density} data-sticky={stickyHeader || undefined} {...wrapperProps}>
      {hasColumnMenu && (
        <div className="data-table-toolbar">
          <details className="data-table-columns" aria-label={columnMenuLabel}>
            <summary role="button" tabIndex={0} className="data-table-columns-toggle">{columnMenuLabel ?? "Columns"}</summary>
            <div role="menu" className="data-table-columns-menu">
              {columns.filter((column) => column.visible !== false).map((column) => (
                <label key={column.id} className="data-table-columns-item" role="menuitemcheckbox" aria-checked={!hiddenColumns.has(column.id)}>
                  <input type="checkbox" checked={!hiddenColumns.has(column.id)} onChange={() => toggleColumn(column.id)} />
                  {column.header}
                </label>
              ))}
            </div>
          </details>
        </div>
      )}
      <Table.Content className="data-table" aria-label={ariaLabel} aria-busy={loading}>
        <Table.Header>
          {selectable && <Table.Column id="selection"><input ref={headerSelectionRef} type="checkbox" checked={allSelected} onChange={toggleAll} aria-checked={partiallySelected ? "mixed" : allSelected} aria-label={selectionLabel} /></Table.Column>}
          {visibleColumns.map((column, index) => <Table.Column id={column.id} className={column.className} isRowHeader={index === 0} key={column.id}>{column.header}</Table.Column>)}
          {hasRowMenu && <Table.Column id="row-menu" aria-label={columnMenuLabel ?? ""} />}
        </Table.Header>
        <Table.Body>
          {loading && <Table.Row>{selectable && <Table.Cell />}{visibleColumns.map((column) => <Table.Cell key={column.id}><Skeleton lines={3} label={loadingLabel ?? ""} /></Table.Cell>)}{hasRowMenu && <Table.Cell />}</Table.Row>}
          {!loading && rows.length === 0 && <Table.Row>{selectable && <Table.Cell />}<Table.Cell>{emptyState}</Table.Cell>{visibleColumns.slice(1).map((column) => <Table.Cell key={column.id} />)}{hasRowMenu && <Table.Cell />}</Table.Row>}
          {!loading && rows.map((row, index) => { const key = getRowKey(row, index); return <Table.Row key={key}>{selectable && <Table.Cell><input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} aria-label={selectionLabel} /></Table.Cell>}{visibleColumns.map((column) => <Table.Cell className={column.className} key={column.id}>{column.cell(row, index)}</Table.Cell>)}{hasRowMenu && <Table.Cell><DataTableRowMenu<Row> row={row} index={index} renderRowMenu={renderRowMenu!} /></Table.Cell>}</Table.Row>; })}
        </Table.Body>
      </Table.Content>
    </Table.Root>
  );
}

/** 行操作菜单：渲染 renderRowMenu 返回的真实操作（仅真实 operation；空数组不渲染）。 */
export function DataTableRowMenu<Row>({ row, index, renderRowMenu }: { row: Row; index: number; renderRowMenu: (row: Row, index: number) => ReadonlyArray<{ key: string; label: ReactNode; onSelect: () => void; danger?: boolean }> }) {
  const items = renderRowMenu(row, index);
  if (items.length === 0) return null;
  return (
    <div className="data-table-row-actions">
      {items.map((item) => <button key={item.key} type="button" className={`ui-button ${item.danger ? "data-table-row-action-danger" : ""}`} onClick={item.onSelect}>{item.label}</button>)}
    </div>
  );
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
  return (
    <HeroPagination.Root aria-label={paginationLabel ?? pageLabel(current)}>
      <div className="pagination-total">{totalLabel(total)}</div>
      <HeroPagination.Content>
        <HeroPagination.Item>
          <HeroPagination.Previous isDisabled={current <= 1} aria-label={previousLabel} onPress={() => onPageChange(current - 1)}>‹</HeroPagination.Previous>
        </HeroPagination.Item>
        {items.map((item) => item === "ellipsis-left" || item === "ellipsis-right"
          ? <HeroPagination.Ellipsis key={item} />
          : <HeroPagination.Item key={item}><HeroPagination.Link isActive={item === current} onPress={() => onPageChange(item)} aria-label={pageLabel(item)} aria-current={item === current ? "page" : undefined}>{item}</HeroPagination.Link></HeroPagination.Item>)}
        <HeroPagination.Item>
          <HeroPagination.Next isDisabled={current >= pageCount} aria-label={nextLabel} onPress={() => onPageChange(current + 1)}>›</HeroPagination.Next>
        </HeroPagination.Item>
      </HeroPagination.Content>
      {pageSizeOptions && pageSizeLabel && onPageSizeChange && <select aria-label={pageSizeLabel} value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="pagination-size">{pageSizeOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select>}
    </HeroPagination.Root>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <HeroEmptyState className="empty-state" title={title}>{detail && <p className="m-0 text-xs text-foreground-500">{detail}</p>}{action}</HeroEmptyState>;
}

// IconButton 是图标按钮原语（HeroUI Button isIconOnly）：提供可访问名称并透传渲染子节点与 data-*。
export function IconButton({ label, title, onClick, onPress, className = "", children, disabled, data, buttonRef }: { label: string; title?: string; onClick?: () => void; onPress?: () => void; className?: string; children: ReactNode; disabled?: boolean; data?: Record<string, string | undefined>; buttonRef?: React.Ref<HTMLButtonElement> }) {
  // HeroUI/RAC Button 不接受原生 title；可访问名称由 aria-label 提供，title 仅作兼容占位。
  void title;
  return <HeroButton ref={buttonRef} type="button" isIconOnly variant="ghost" size="sm" aria-label={label} isDisabled={disabled} onPress={() => (onPress ?? onClick)?.()} className={`icon-button ${className}`.trim()} {...data}>{children}</HeroButton>;
}

// Check 是复选框原语（react-aria-components 底座，HeroUI v3 交互引擎）：
// children 作为可访问名子节点；checked/onChange(boolean)/indeterminate 契约。
export function Check({ children, checked, onChange, disabled, className = "", indeterminate = false }: { children: ReactNode; checked: boolean; onChange?: (checked: boolean) => void; disabled?: boolean; className?: string; indeterminate?: boolean }) {
  return <RACCheckbox isSelected={checked} isIndeterminate={indeterminate} isDisabled={disabled} onChange={(next) => onChange?.(next)} className={`rac-checkbox ${className}`.trim()}>{children}</RACCheckbox>;
}

// Switch 是开关原语（react-aria-components 底座）：label 子节点提供可访问名，
// ariaLabel 提供替代可访问名（配合外部视觉标签行）；视觉走 .rac-switch 平台类。
export function Switch({ label, ariaLabel, checked, onChange, disabled, className = "" }: { label?: ReactNode; ariaLabel?: string; checked: boolean; onChange?: (checked: boolean) => void; disabled?: boolean; className?: string }) {
  return <RACSwitch isSelected={checked} isDisabled={disabled} aria-label={ariaLabel} onChange={(next) => onChange?.(next)} className={`rac-switch ${className}`.trim()}>{label}</RACSwitch>;
}

// SectionNavItem 是页内分区导航项：id 用于 activeId/onSelect，href 存在时按链接渲染。
export type SectionNavItem = { id: string; label: ReactNode; icon?: ReactNode; href?: string };

// SectionNav 是「页内侧边栏」形态的页内分区导航原语（071）：多分区页面在内容区
// 提供垂直分区导航（navlist 语义 + aria-current 高亮 + 键盘上下/Home/End），
// ≤720px 自动转横向滚动条。与全局菜单树并存，共同构成多形态菜单层级。
export function SectionNav({ items, activeId, onSelect, className = "", ariaLabel }: { items: ReadonlyArray<SectionNavItem>; activeId?: string; onSelect?: (id: string) => void; className?: string; ariaLabel?: string }) {
  const listID = `webui-section-nav-${useId().replaceAll(":", "")}`;
  return (
    <nav className={`section-nav ${className}`.trim()} aria-label={ariaLabel} onKeyDown={(event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement.getAttribute("data-section-nav-id") : null;
      let index = items.findIndex((item) => item.id === focused);
      if (index < 0) index = Math.max(0, items.findIndex((item) => item.id === activeId));
      const count = items.length;
      let next: number;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = count - 1;
      else if (event.key === "ArrowDown") next = (index + 1) % count;
      else next = (index - 1 + count) % count;
      const nextItem = document.querySelector<HTMLElement>(`[data-section-nav-list="${listID}"] [data-section-nav-id="${items[next].id}"]`);
      nextItem?.focus();
    }}>
      <ul role="list" data-section-nav-list={listID} className="section-nav-list">
        {items.map((item) => {
          const active = item.id === activeId;
          const common = { "data-section-nav-id": item.id, "aria-current": active ? ("page" as const) : undefined, className: active ? "section-nav-item active" : "section-nav-item" };
          return <li key={item.id}>{item.href
            ? <a href={item.href} onClick={onSelect ? (event) => { event.preventDefault(); onSelect?.(item.id); } : undefined} {...common}>{item.icon && <span className="section-nav-icon" aria-hidden="true">{item.icon}</span>}<span>{item.label}</span></a>
            : <button type="button" onClick={() => onSelect?.(item.id)} {...common}>{item.icon && <span className="section-nav-icon" aria-hidden="true">{item.icon}</span>}<span>{item.label}</span></button>}</li>;
        })}
      </ul>
    </nav>
  );
}

// SelectField 复用 HeroUI Select 复合组件（RAC 底座）：Label + Trigger/Value + ListBox。
// 对外保持 value/onValueChange(options) 契约，模块页面不再使用原生 <select>。
export type SelectOption = { value: string; label: ReactNode };

export function SelectField({ label, value, options, onValueChange, className = "", placeholder, error }: { label: string; value: string; options: ReadonlyArray<SelectOption>; onValueChange: (value: string) => void; className?: string; placeholder?: string; error?: string }) {
  return (
    <div className={`form-field ${error ? "has-error" : ""}`.trim()}>
      <Select selectedKey={value} onSelectionChange={(key) => onValueChange(key === null || key === undefined ? "" : String(key))} className={className} isInvalid={Boolean(error)}>
        <Label>{label}</Label>
        <Select.Trigger><Select.Value>{({ selectedText }) => selectedText ?? placeholder ?? ""}</Select.Value></Select.Trigger>
        <Select.Indicator />
        <Select.Popover>
          <ListBox className="max-h-72 overflow-auto">
            {options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={typeof option.label === "string" ? option.label : String(option.label)}>{option.label}</ListBox.Item>)}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

export function InlineAlert({ tone = "info", title, detail, action }: { tone?: "info" | "success" | "warning" | "danger"; title: string; detail?: ReactNode; action?: ReactNode }) {
  const status = tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "success" ? "success" : "accent";
  return <Alert status={status} className={`inline-alert inline-alert-${tone}`} role="status"><Alert.Content><Alert.Title><strong>{title}</strong></Alert.Title><Alert.Description>{detail && <span>{detail}</span>}</Alert.Description></Alert.Content>{action && <Alert.Content><span className="inline-alert-action">{action}</span></Alert.Content>}</Alert>;
}

// Toast 通过 @heroui/toast 队列呈现：组件挂载/打开时推入队列，语义与既有 open 契约一致。
export function Toast({ open, tone = "info", title, detail, closeLabel, onClose }: { open: boolean; tone?: "info" | "success" | "warning" | "danger"; title: string; detail?: string; closeLabel: string; onClose: () => void }) {
  const keyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const color = tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "success" ? "success" : "primary";
    keyRef.current = addToast({ title, description: detail, variant: "solid", color, timeout: 5000, onClose });
    return () => {
      if (keyRef.current) closeToast(keyRef.current);
      keyRef.current = null;
    };
  }, [open, tone, title, detail, onClose]);
  void closeLabel;
  return null;
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, closeLabel, onConfirm, onCancel }: { open: boolean; title: string; description?: string; confirmLabel: string; cancelLabel: string; closeLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const titleID = `webui-confirm-title-${useId().replaceAll(":", "")}`;
  // 069：确认弹窗迁到 RAC 受控 Modal+Dialog（焦点/Escape/backdrop 由 react-aria 承担）。
  return (
    <RACModal isOpen={open} onOpenChange={(next) => { if (!next) onCancel(); }} isDismissable className="rac-modal-backdrop">
      <RACDialog aria-label={title} id={titleID} className="rac-modal-panel">
        <header className="confirm-dialog-header"><h2 id={titleID}>{title}</h2><IconButton label={closeLabel} onClick={onCancel}>×</IconButton></header>
        {description && <p id={`${titleID}-description`} className="confirm-dialog-description">{description}</p>}
        <footer className="confirm-dialog-footer"><Button type="button" variant="secondary" data-confirm-initial-focus onClick={onCancel}>{cancelLabel}</Button><Button type="button" variant="danger" onClick={onConfirm}>{confirmLabel}</Button></footer>
      </RACDialog>
    </RACModal>
  );
}

export function Drawer({ open, title, description, closeLabel, onClose, children, footer, className = "", style }: { open: boolean; title: string; description?: string; closeLabel: string; onClose: () => void; children: ReactNode; footer?: ReactNode; className?: string; style?: CSSProperties }) {
  const titleID = `webui-drawer-title-${useId().replaceAll(":", "")}`;
  // 069：侧滑抽屉迁到 RAC 受控 Modal+Dialog（右置面板，焦点/Escape/backdrop 由 react-aria 承担）。
  return (
    <RACModal isOpen={open} onOpenChange={(next) => { if (!next) onClose(); }} isDismissable className="rac-modal-backdrop rac-modal-backdrop-drawer">
      <RACDialog aria-label={title} id={titleID} className={`rac-drawer-panel ${className}`.trim()} style={style}>
        <header className="ui-drawer-header"><div><h2 id={titleID}>{title}</h2>{description && <p>{description}</p>}</div><IconButton label={closeLabel} onClick={onClose}>×</IconButton></header>
        <div className="ui-drawer-content">{children}</div>
        {footer && <footer className="ui-drawer-footer">{footer}</footer>}
      </RACDialog>
    </RACModal>
  );
}

// ActionDisabledReason 是触发点禁用原因分类：permission（权限 denied/未投影受限）、
// unavailable（能力不可用）、busy（其他提交进行中）、invalid（表单条件未满足）。
export type ActionDisabledReason = "permission" | "unavailable" | "busy" | "invalid";

// ActionTrigger 是统一动作触发原语（062 交互规范），按钮底座为 HeroUI Button（068）：
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
  return <Button type="button" variant={variant} disabled={disabled} onClick={handleAction} aria-busy={busy || undefined} aria-disabled={disabled || undefined} data-action-state={state} className={className} {...buttonProps as object}>{busy && pendingLabel ? pendingLabel : children}</Button>;
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

// ConfirmActionTrigger 是危险/不可逆操作的确认动作原语（083 PAGE-007，设计基线「危险即确认」）：
// 按钮按下 -> ConfirmDialog 确认 -> 执行 onConfirm（Promise，pending 防重复）。
export function ConfirmActionTrigger({ operationId, variant = "danger", label, pendingLabel, confirmTitle, confirmDescription, confirmLabel, cancelLabel, closeLabel, disabled, disabledReason, onConfirm, onError }: {
  operationId?: string;
  variant?: "danger" | "primary" | "secondary" | "ghost";
  label: ReactNode;
  pendingLabel?: ReactNode;
  confirmTitle: string;
  confirmDescription?: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  disabled?: boolean;
  disabledReason?: ActionDisabledReason;
  onConfirm: () => Promise<unknown>;
  onError?: (error: Error) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const run = () => {
    setConfirmOpen(false);
    void onConfirm().catch((error) => onError?.(error instanceof Error ? error : new Error("action_failed")));
  };
  return <>
    <ActionTrigger operationId={operationId} variant={variant} deniedBehavior="hidden" pendingLabel={pendingLabel} disabled={disabled} disabledReason={disabledReason} onAction={() => { setConfirmOpen(true); }}>{label}</ActionTrigger>
    <ConfirmDialog open={confirmOpen} title={confirmTitle} description={confirmDescription} confirmLabel={confirmLabel} cancelLabel={cancelLabel} closeLabel={closeLabel} onConfirm={run} onCancel={() => setConfirmOpen(false)} />
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

// ---------------------------------------------------------------------------
// 067 布局骨架原语：HeroUI Card 底座 + Tailwind 布局，保留既有 class 名作为
// 语义钩子（page-section/stat-card/data-card/data-reveal），e2e/样式选测不变。
// ---------------------------------------------------------------------------

export type PageSectionProps = {
  as?: "section" | "div" | "article";
  kicker?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  rhythm?: "calm" | "balanced" | "playful";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export function PageSection({ as: As = "section", kicker, title, description, actions, footer, rhythm = "balanced", className = "", style, children }: PageSectionProps) {
  return (
    <Reveal as={As} rhythm={rhythm} className={`page-section w-full ${className}`.trim()} style={style}>
      <Card className="h-full w-full shadow-sm">
        {(kicker || title || description || actions) && (
          <Card.Header className="flex items-start justify-between gap-4 px-5 pt-4">
            <div className="min-w-0">
              {kicker && <span className="section-kicker block text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{kicker}</span>}
              {title && <h2 className="section-title mt-0.5 text-[15px] font-semibold">{title}</h2>}
              {description && <p className="section-description mt-1 max-w-[640px] text-xs leading-relaxed text-foreground-500">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
          </Card.Header>
        )}
        <Card.Content className="grid gap-3.5 px-5 py-4">{children}</Card.Content>
        {footer && <Card.Footer className="flex items-center justify-end gap-2 border-t border-divider px-5 py-3">{footer}</Card.Footer>}
      </Card>
    </Reveal>
  );
}

export type StatCardProps = {
  icon?: ReactNode;
  value: ReactNode;
  label: ReactNode;
  trend?: ReactNode;
  tone?: "default" | "positive" | "attention";
  rhythm?: "calm" | "balanced" | "playful";
  className?: string;
};

const statToneClass = { default: "", positive: "stat-tone-positive", attention: "stat-tone-attention" } as const;

export function StatCard({ icon, value, label, trend, tone = "default", rhythm = "balanced", className = "" }: StatCardProps) {
  return (
    <Reveal as="div" rhythm={rhythm} className={`stat-card ${statToneClass[tone]} ${className}`.trim()}>
      <Card className="flex w-full min-h-[84px] items-center gap-3 px-4 py-3.5 shadow-sm">
        {icon && <span className="stat-icon grid size-9 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700" aria-hidden="true">{icon}</span>}
        <span className="stat-copy grid min-w-0 gap-1.5">
          <strong className="stat-value text-[22px] font-semibold leading-none tracking-tight">{value}</strong>
          <small className="stat-label text-[11px] text-foreground-500">{label}</small>
        </span>
        {trend && <span className="stat-trend ml-auto whitespace-nowrap rounded-full bg-success-100 px-2 py-0.5 text-[10px] text-success-700">{trend}</span>}
      </Card>
    </Reveal>
  );
}

/** MetricCard 是带状态、占用率和趋势序列的监控指标卡；业务模块只提供已计算的数据。 */
export function MetricCard({ title, value, unit, percent, trend = [], trendLabel, state, stateLabel, detail, className = "" }: {
  title: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  percent?: number;
  trend?: number[];
  trendLabel: string;
  state?: CapabilityState;
  stateLabel?: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  const clampedPercent = percent === undefined ? undefined : Math.min(100, Math.max(0, percent));
  return <Card className={`metric-card ${state ? `metric-card-${state}` : ""} ${className}`.trim()}>
    <Card.Content className="grid gap-2 px-4 py-3.5">
      <div className="metric-card-heading"><h4>{title}</h4>{state && stateLabel && <StatusPill state={state}>{stateLabel}</StatusPill>}</div>
      <div className="metric-card-value"><strong>{value}</strong>{unit && <span className="metric-card-unit">{unit}</span>}</div>
      {clampedPercent !== undefined && <div className="metric-card-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clampedPercent)}><span style={{ width: `${clampedPercent}%` }} /></div>}
      <Sparkline values={trend} ariaLabel={trendLabel} width={140} height={36} />
      {detail && <p className="page-meta">{detail}</p>}
    </Card.Content>
  </Card>;
}

export function StatGrid({ columns = 4, className = "", children }: { columns?: number; className?: string; children?: ReactNode }) {
  return <div className={`stat-grid mb-5 ${className}`.trim()} style={{ "--stat-columns": columns } as CSSProperties} data-stat-columns={columns}>{children}</div>;
}

export function DataCard({ kicker, title, description, actions, footer, className = "", children }: { kicker?: ReactNode; title?: ReactNode; description?: ReactNode; actions?: ReactNode; footer?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <section className={`data-card w-full ${className}`.trim()}>
      <Card className="h-full w-full shadow-sm">
        <Reveal as="div" className="flex items-start justify-between gap-4 px-5 pt-4" rhythm="balanced">
          {(kicker || title || description) && <div className="min-w-0">{kicker && <span className="section-kicker block text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{kicker}</span>}{title && <h2 className="section-title mt-0.5 text-[15px] font-semibold">{title}</h2>}{description && <p className="section-description mt-1 max-w-[640px] text-xs leading-relaxed text-foreground-500">{description}</p>}</div>}
          {actions && <div className="flex items-center justify-end gap-2">{actions}</div>}
        </Reveal>
        <Card.Content className="grid gap-3.5 px-5 pb-1 pt-3">{children}</Card.Content>
        {footer && <Card.Footer className="flex items-center justify-between gap-2 px-5 pb-4 pt-2.5">{footer}</Card.Footer>}
      </Card>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   082 REQ-082-002：FilterBar / SearchInput 语义组件（方案「十八/十九」）。
   FilterBar 承担统一列表工具栏（Search → Primary filters → Clear → Result count），
   状态由页面 owner 经 useListQueryParams 驱动（URL 同步）；本组件只做受控呈现。
   --------------------------------------------------------------------------- */

export type FilterFieldControl = "select" | "switch" | "input";

/** FilterBar 的字段声明：一个 filter 对应一个受控控件。 */
export type FilterBarField = {
  key: string;
  label: ReactNode;
  control: FilterFieldControl;
  /** select 控件选项（control=select 时必须）。 */
  options?: ReadonlyArray<SelectOption>;
  /** 受控值：select 为字符串 value，switch 为 boolean，input 为字符串。 */
  value: string | boolean | undefined;
  onValueChange: (next: string | boolean) => void;
};

/**
 * FilterBar：列表页统一 filter 行。
 * - fields 渲染 SearchInput 之外的主/辅过滤器（受控）；
 * - onClear 清空全部 filter（配合 useListQueryParams.clearFilters）；
 * - resultCount 显示「N 条结果」（可选）。
 */
export function FilterBar({ fields, onClear, clearLabel, resultCount, resultCountLabel, searchInput, ariaLabel }: {
  fields: ReadonlyArray<FilterBarField>;
  onClear?: () => void;
  clearLabel?: ReactNode;
  resultCount?: number;
  resultCountLabel?: (count: number) => ReactNode;
  searchInput?: ReactNode;
  ariaLabel?: string;
}) {
  const hasActive = fields.some((field) => {
    if (Array.isArray(field.value) && field.value.length > 0) return true;
    return field.value !== undefined && field.value !== "" && field.value !== false;
  });
  return (
    <div className="filter-bar" role="group" aria-label={ariaLabel}>
      {searchInput}
      <div className="filter-bar-fields">
        {fields.map((field) => {
          switch (field.control) {
            case "switch":
              return <Switch key={field.key} label={field.label} checked={field.value === true} onChange={(next) => field.onValueChange(next)} />;
            case "input":
              return <label key={field.key} className="filter-field"><span className="filter-field-label">{field.label}</span><input type="text" value={typeof field.value === "string" ? field.value : ""} onChange={(event) => field.onValueChange(event.target.value)} /></label>;
            case "select":
            default:
              return <SelectField key={field.key} label={String(field.label)} value={typeof field.value === "string" ? field.value : ""} options={field.options ?? []} onValueChange={(next) => field.onValueChange(next)} />;
          }
        })}
      </div>
      {hasActive && onClear && <button type="button" className="filter-bar-clear ui-button" onClick={onClear}>{clearLabel ?? "Clear"}</button>}
      {resultCount !== undefined && <span className="filter-bar-count">{resultCountLabel ? resultCountLabel(resultCount) : `${resultCount} results`}</span>}
    </div>
  );
}

/**
 * SearchInput：带防抖的搜索输入（受控由页面 owner 管理 debounceMs/onChange）。
 * 只做受控输入渲染；不承载搜索逻辑（真实 server/client search 由页面实现）。
 */
export function SearchInput({ value, onChange, placeholder, label, debounceMs = 300, className = "" }: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  label?: string;
  debounceMs?: number;
  className?: string;
}) {
  const timerRef = useRef<number | null>(null);
  const handleChange = (raw: string) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onChange(raw), debounceMs);
  };
  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);
  return (
    <div className={`search-input-wrap ${className}`.trim()}>
      <label className="search-input-icon" aria-hidden="true">🔍</label>
      <input
        type="search"
        className="search-input"
        value={value}
        aria-label={label ?? placeholder ?? "Search"}
        placeholder={placeholder ?? "Search…"}
        onChange={(event) => handleChange(event.target.value)}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   082 REQ-082-004/005：状态与反馈语义体系 + 语义组件（方案「二十九/三十一/三十三/
   三十六/五十一」）。EmptyState 在既有 HeroEmptyState 之上结构化；StatusBadge 统一
   状态集；DangerZone 统一危险操作流程；CodeText 统一技术标识符 monospace 呈现；
   ErrorState 按分级呈现（Page/Section/Inline/Action/Permission/Connectivity）。
   --------------------------------------------------------------------------- */

/** 语义状态集（方案「二十九」）：对应 080 Token/会话/账号与 081 监控状态机。 */
export type SemanticStatus = "active" | "inactive" | "enabled" | "disabled" | "pending" | "healthy" | "degraded" | "failed" | "expired" | "revoked";

const statusTone: Record<SemanticStatus, "success" | "warning" | "danger" | "default" | "accent"> = {
  active: "success",
  enabled: "success",
  healthy: "success",
  pending: "warning",
  degraded: "warning",
  inactive: "default",
  disabled: "default",
  expired: "warning",
  revoked: "danger",
  failed: "danger",
};

/** StatusBadge：统一状态呈现（Badge 只用于状态/分类；ID/权限码/元数据走 CodeText）。 */
export function StatusBadge({ status, children, className = "" }: { status: SemanticStatus; children: ReactNode; className?: string }) {
  return <Chip color={statusTone[status]} variant="soft" size="sm" className={`status-badge status-${status} ${className}`.trim()}>{children}</Chip>;
}

/** CodeText：技术标识符 monospace 呈现（方案「五十一」；权限 ID/Token ID/审计 hash 等）。 */
export function CodeText({ value, copyable = false, className = "", copyLabel }: { value: string; copyable?: boolean; className?: string; copyLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => undefined);
  };
  return (
    <span className={`code-text ${className}`.trim()}>
      <code className="code-text-value">{value}</code>
      {copyable && <button type="button" className="code-text-copy ui-button" onClick={copy} aria-label={copyLabel ?? "Copy"}>{copied ? "✓" : "⧉"}</button>}
    </span>
  );
}

/** DangerZone：统一危险操作区（方案「三十六」：后果说明 + 确认（可要求输入标识符）+ pending + 失败反馈）。 */
export function DangerZone({ title, consequence, confirmTitleText, inputConfirmation, confirmLabel, cancelLabel, closeLabel, busy, busyLabel, onConfirm, className = "" }: {
  title: string;
  consequence: ReactNode;
  confirmTitleText?: string;
  inputConfirmation?: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => Promise<unknown>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [failed, setFailed] = useState(false);
  const requireInput = Boolean(inputConfirmation);
  const canConfirm = !requireInput || typed === inputConfirmation;
  const run = () => {
    setFailed(false);
    void onConfirm().catch(() => setFailed(true)).finally(() => setOpen(false));
  };
  return (
    <div className={`danger-zone ${className}`.trim()}>
      <div className="danger-zone-header"><strong className="danger-zone-title">{title}</strong><button type="button" className="ui-button" onClick={() => { setTyped(""); setFailed(false); setOpen(true); }}>{confirmLabel}</button></div>
      <div className="danger-zone-consequence">{consequence}</div>
      <ConfirmDialog open={open} title={confirmTitleText ?? title} description={failed ? "操作失败，请重试。" : undefined} confirmLabel={confirmLabel} cancelLabel={cancelLabel} closeLabel={closeLabel} onConfirm={() => { setOpen(false); run(); }} onCancel={() => setOpen(false)} />
      {open && (
        <div className="danger-zone-confirm" role="dialog" aria-modal="true" aria-label={confirmTitleText ?? title}>
          <p>{consequence}</p>
          {requireInput && <label className="danger-zone-confirm-input">请输入 <code>{inputConfirmation}</code> 以确认<input type="text" value={typed} onChange={(event) => setTyped(event.target.value)} /></label>}
          <div className="danger-zone-confirm-actions">
            <button type="button" className="ui-button" disabled={!canConfirm || busy} onClick={() => { setFailed(false); void run(); }}>{busy ? busyLabel ?? "处理中…" : confirmLabel}</button>
            <button type="button" className="ui-button" onClick={() => setOpen(false)}>{cancelLabel}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** ErrorState：错误分级呈现（方案「三十三」；Page 用 SystemStatePage 由宿主承担，此处提供 Section/Inline/Action/Permission/Connectivity）。 */
export function ErrorState({ kind = "section", title, detail, action, className = "" }: {
  kind?: "section" | "inline" | "action" | "permission" | "connectivity";
  title: string;
  detail?: string;
  action?: ReactNode;
  className?: string;
}) {
  if (kind === "permission") {
    return <div className={`error-state error-state-permission ${className}`.trim()} role="alert"><span className="error-state-title">{title}</span>{detail && <span className="error-state-detail">{detail}</span>}</div>;
  }
  switch (kind) {
    case "inline":
      return <div className={`error-state error-state-inline ${className}`.trim()} role="alert"><span className="error-state-title">{title}</span>{detail && <span className="error-state-detail">{detail}</span>}{action && <span className="error-state-action">{action}</span>}</div>;
    case "action":
      return <div className={`error-state error-state-action ${className}`.trim()} role="alert"><span className="error-state-title">{title}</span>{action && <span className="error-state-action">{action}</span>}</div>;
    case "connectivity":
      return <div className={`error-state error-state-connectivity ${className}`.trim()} role="alert"><span className="error-state-title">{title}</span>{detail && <span className="error-state-detail">{detail}</span>}{action && <span className="error-state-action">{action}</span>}</div>;
    default:
      return <div className={`error-state error-state-section ${className}`.trim()} role="alert"><span className="error-state-title">{title}</span>{detail && <span className="error-state-detail">{detail}</span>}{action && <span className="error-state-action">{action}</span>}</div>;
  }
}

/* ---------------------------------------------------------------------------
   082 REQ-082-005：CodeViewer / DetailDrawer 语义组件。
   CodeViewer 用 highlight.js（仅 json）渲染结构化元数据（审计摘要/技术详情）；
   DetailDrawer 是规格化 Master–Detail 抽屉（Header/Metadata/Actions/Tabs/Content），
   宽度档 480/560/640/720，支持深链与 loading/error 态。
   --------------------------------------------------------------------------- */

/** CodeViewer：只读结构化数据展示（语言限 json/plain；折叠与最大高度受控）。 */
export function CodeViewer({ value, language = "json", maxHeight = 320, initiallyCollapsed = false, className = "", label }: {
  value: string;
  language?: "json" | "plain";
  maxHeight?: number;
  initiallyCollapsed?: boolean;
  className?: string;
  label?: string;
}) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  if (!value.trim()) return null;
  return (
    <div className={`code-viewer ${className}`.trim()}>
      <div className="code-viewer-head">
        <span className="code-viewer-label">{label ?? language}</span>
        <button type="button" className="code-viewer-toggle ui-button" onClick={() => setCollapsed((current) => !current)}>{collapsed ? "▸" : "▾"}</button>
      </div>
      {!collapsed && <pre className="code-viewer-pre" style={{ maxHeight }}><code className={`code-viewer-code ${language === "json" ? "language-json" : ""}`}>{value}</code></pre>}
    </div>
  );
}

/** EntityHeader 统一详情实体的身份、状态和动作区，供抽屉与页面详情复用。 */
export function EntityHeader({ title, identity, status, actions, className = "" }: { title?: ReactNode; identity?: ReactNode; status?: ReactNode; actions?: ReactNode; className?: string }) {
  return <div className={`entity-header ${className}`.trim()}>
    {title && <h2 className="entity-header-title">{title}</h2>}
    {identity && <div className="entity-header-identity">{identity}</div>}
    {status && <div className="entity-header-status">{status}</div>}
    {actions && <div className="entity-header-actions">{actions}</div>}
  </div>;
}

/** DetailDrawer：规格化 Master–Detail 抽屉（REQ-082-005/021/016）。 */
export function DetailDrawer({ open, onClose, title, identity, status, actions, width = 640, loading = false, loadingLabel, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  identity?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  width?: 480 | 560 | 640 | 720;
  loading?: boolean;
  loadingLabel?: string;
  children?: ReactNode;
}) {
  return (
    <Drawer open={open} title={title} closeLabel={loadingLabel ?? "关闭"} onClose={onClose} className="detail-drawer" style={{ "--drawer-width": `${width}px` } as CSSProperties}>
      <EntityHeader identity={identity} status={status} actions={actions} className="detail-drawer-head" />
      {loading ? <Skeleton lines={4} label={loadingLabel ?? ""} /> : children}
    </Drawer>
  );
}

/* ---------------------------------------------------------------------------
   082 REQ-082-005/018：TreeView 语义组件（方案「四十四」Organization：树 + 详情；
   仅渲染真实层级，不提供后端不支持的 Move/Reorder/Archive DnD）。
   --------------------------------------------------------------------------- */

/** TreeView：无环树展示（受控展开）。 */
export function TreeView<T>({ nodes, getChildren, renderNode, getKey = (node) => String(node), selectedId, onSelect, expandAll = false, ariaLabel }: {
  nodes: ReadonlyArray<T>;
  getChildren: (node: T) => ReadonlyArray<T>;
  renderNode: (node: T) => ReactNode;
  getKey?: (node: T) => string;
  selectedId?: string;
  onSelect?: (key: string) => void;
  expandAll?: boolean;
  ariaLabel?: string;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => (expandAll ? new Set<string>() : new Set<string>(collectKeys(nodes, getChildren, getKey))));
  const toggle = (key: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  return (
    <ul className="tree-view" role="tree" aria-label={ariaLabel}>
      <TreeNodes nodes={nodes} getChildren={getChildren} renderNode={renderNode} getKey={getKey} collapsed={collapsed} onToggle={toggle} selectedId={selectedId} onSelect={onSelect} depth={0} />
    </ul>
  );
}

function collectKeys<T>(nodes: ReadonlyArray<T>, getChildren: (n: T) => ReadonlyArray<T>, getKey: (n: T) => string): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    const children = getChildren(node);
    if (children.length > 0) { keys.push(getKey(node)); keys.push(...collectKeys(children, getChildren, getKey)); }
  }
  return keys;
}

function TreeNodes<T>({ nodes, getChildren, renderNode, getKey, collapsed, onToggle, selectedId, onSelect, depth }: {
  nodes: ReadonlyArray<T>;
  getChildren: (n: T) => ReadonlyArray<T>;
  renderNode: (n: T) => ReactNode;
  getKey: (n: T) => string;
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
  selectedId?: string;
  onSelect?: (key: string) => void;
  depth: number;
}) {
  return <>{nodes.map((node) => {
    const key = getKey(node);
    const children = getChildren(node);
    const isCollapsed = collapsed.has(key);
    const selected = key === selectedId;
    return (
      <li key={key} role="treeitem" aria-expanded={children.length > 0 ? !isCollapsed : undefined} aria-selected={selected || undefined} data-tree-depth={depth}>
        <div className={`tree-node ${selected ? "tree-node-selected" : ""}`.trim()}>
          {children.length > 0
            ? <button type="button" className="tree-node-toggle" aria-label={isCollapsed ? "expand" : "collapse"} onClick={() => onToggle(key)}>{isCollapsed ? "▸" : "▾"}</button>
            : <span className="tree-node-toggle tree-node-toggle-empty" aria-hidden="true" />}
          <button type="button" className="tree-node-label" onClick={() => onSelect?.(key)}>{renderNode(node)}</button>
        </div>
        {children.length > 0 && !isCollapsed && <ul role="group">{<TreeNodes nodes={children} getChildren={getChildren} renderNode={renderNode} getKey={getKey} collapsed={collapsed} onToggle={onToggle} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />}</ul>}
      </li>
    );
  })}</>;
}

/** InspectorPanel：Tree 选中节点的详情区（方案「四十四」；fields 支持 mono 技术字段）。 */
export function InspectorPanel({ title, fields, status, actions, children, className = "" }: {
  title: ReactNode;
  fields: ReadonlyArray<{ label: ReactNode; value: ReactNode; mono?: boolean }>;
  status?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`inspector-panel ${className}`.trim()} aria-label={typeof title === "string" ? title : undefined}>
      <h3 className="inspector-panel-title">{title}</h3>
      <div className="inspector-panel-fields">
        {fields.map((field) => (
          <div className="inspector-field" key={String(field.label)}>
            <span className="inspector-field-label">{field.label}</span>
            {field.mono ? <CodeText value={String(field.value)} /> : <span className="inspector-field-value">{field.value}</span>}
          </div>
        ))}
      </div>
      {(status || actions) && <div className="inspector-panel-status">{status}{actions}</div>}
      {children}
    </section>
  );
}
