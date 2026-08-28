import type { HTMLAttributes, ReactNode } from "react";

/**
 * ResourceIndex 统一资源列表的认知顺序：摘要 → 查询工具栏 → 数据表/列表 →
 * 分页或批处理。它不假设具体数据源，页面只注入已授权、已查询的内容。
 */
export function ResourceIndex({ summary, toolbar, children, footer, className = "", ...props }: {
  summary?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  return <section className={`resource-index ${className}`.trim()} {...props}>
    {summary && <div className="resource-index-summary">{summary}</div>}
    {toolbar && <div className="resource-index-toolbar">{toolbar}</div>}
    <div className="resource-index-content">{children}</div>
    {footer && <div className="resource-index-footer">{footer}</div>}
  </section>;
}

/** EntityDetail 将详情页固定为身份/状态/主要动作 + 分区内容。 */
export function EntityDetail({ header, children, className = "", ...props }: {
  header: ReactNode;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  return <article className={`entity-detail ${className}`.trim()} {...props}>
    <div className="entity-detail-header">{header}</div>
    <div className="entity-detail-content">{children}</div>
  </article>;
}

/** StickyActionBar 将表单提交/取消固定在内容末端，并显式表达 dirty/conflict/pending 状态。 */
export function StickyActionBar({ children, state = "clean", status, className = "", ...props }: {
  children: ReactNode;
  state?: "clean" | "dirty" | "pending" | "conflict";
  status?: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return <div className={`sticky-action-bar ${className}`.trim()} data-action-state={`form-${state}`} {...props}>
    {status && <span className="sticky-action-status" aria-live={state === "conflict" ? "assertive" : "polite"}>{status}</span>}
    {children}
  </div>;
}
