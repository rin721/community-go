import { useEffect, useRef, type ReactNode } from "react";
import { Alert, Chip, EmptyState as HeroEmptyState, Skeleton as HeroSkeleton, toast as herouiToast } from "@heroui/react";
import type { CapabilityState } from "../contracts";

/** SemanticStatus 是跨资源复用的状态集合；颜色只表达语义，不承担分类/身份信息。 */
export type SemanticStatus = "active" | "inactive" | "enabled" | "disabled" | "pending" | "healthy" | "degraded" | "failed" | "expired" | "revoked";

const statusTone: Record<SemanticStatus, "success" | "warning" | "danger" | "default" | "accent"> = {
  active: "success", enabled: "success", healthy: "success", pending: "warning", degraded: "warning",
  inactive: "default", disabled: "default", expired: "warning", revoked: "danger", failed: "danger",
};

/** StatusBadge 统一状态呈现；ID、权限码和元数据应使用 CodeText。 */
export function StatusBadge({ status, children, className = "" }: { status: SemanticStatus; children: ReactNode; className?: string }) {
  return <Chip color={statusTone[status]} variant="soft" size="sm" className={`status-badge status-${status} ${className}`.trim()}>{children}</Chip>;
}

/** StatusPill 将运行时能力状态映射为通用状态语义。 */
export function StatusPill({ state, children }: { state: CapabilityState; children: ReactNode }) {
  const semanticState: SemanticStatus = state === "available" ? "healthy" : state === "degraded" ? "degraded" : state === "unavailable" ? "failed" : "pending";
  return <StatusBadge status={semanticState} className={`status-pill status-${state}`}>{children}</StatusBadge>;
}

function alertStatus(state: CapabilityState): "default" | "success" | "warning" | "danger" | "accent" {
  switch (state) {
    case "available": return "success";
    case "degraded": return "warning";
    case "unavailable": return "danger";
    default: return "accent";
  }
}

/** CapabilityBanner 用于页面级能力状态，不把健康状态伪装成成功操作 toast。 */
export function CapabilityBanner({ state, statusLabel, title, detail }: { state: CapabilityState; statusLabel: string; title: string; detail?: string }) {
  return <Alert status={alertStatus(state)} className={`capability-banner capability-${state}`} role="status" aria-live="polite"><Alert.Content><Alert.Title>{statusLabel}</Alert.Title><Alert.Description><strong>{title}</strong>{detail && <> · {detail}</>}</Alert.Description></Alert.Content></Alert>;
}

/** Skeleton 复用 HeroUI Skeleton，统一加载占位行高。 */
export function Skeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return <div className="skeleton-stack" aria-label={label}>{Array.from({ length: lines }, (_, index) => <HeroSkeleton className="h-2.5 rounded-full" key={index} />)}</div>;
}

/** EmptyState 表达无数据或筛选无结果，并允许注入下一步动作。 */
export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <HeroEmptyState className="empty-state" title={title}>{detail && <p className="m-0 text-xs text-foreground-500">{detail}</p>}{action}</HeroEmptyState>;
}

/** InlineAlert 是不会打断当前流程的局部反馈。 */
export function InlineAlert({ tone = "info", title, detail, action }: { tone?: "info" | "success" | "warning" | "danger"; title: string; detail?: ReactNode; action?: ReactNode }) {
  const status = tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "success" ? "success" : "accent";
  return <Alert status={status} className={`inline-alert inline-alert-${tone}`} role="status"><Alert.Content><Alert.Title><strong>{title}</strong></Alert.Title><Alert.Description>{detail && <span>{detail}</span>}</Alert.Description></Alert.Content>{action && <Alert.Content><span className="inline-alert-action">{action}</span></Alert.Content>}</Alert>;
}

/** Toast 通过 HeroUI 队列呈现短暂反馈；页面仍负责持有 open 状态与业务文案。 */
export function Toast({ open, tone = "info", title, detail, closeLabel, onClose }: { open: boolean; tone?: "info" | "success" | "warning" | "danger"; title: string; detail?: string; closeLabel: string; onClose: () => void }) {
  const keyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const notify = tone === "danger" ? herouiToast.danger : tone === "warning" ? herouiToast.warning : tone === "success" ? herouiToast.success : herouiToast.info;
    keyRef.current = notify(title, { description: detail, timeout: 5000, onClose });
    return () => {
      if (keyRef.current) herouiToast.close(keyRef.current);
      keyRef.current = null;
    };
  }, [open, tone, title, detail, onClose]);
  void closeLabel;
  return null;
}

/** ErrorState 按作用域区分 section/inline/action/permission/connectivity。 */
export function ErrorState({ kind = "section", title, detail, action, requestId, className = "" }: {
  kind?: "section" | "inline" | "action" | "permission" | "connectivity";
  title: string;
  detail?: string;
  action?: ReactNode;
  /** requestId 只用于低敏故障关联，不把服务端 detail 直接暴露给用户。 */
  requestId?: string;
  className?: string;
}) {
  const correlation = requestId ? <code className="error-state-request-id" data-request-id={requestId} aria-label="request id">{requestId}</code> : null;
  if (kind === "permission") return <div className={`error-state error-state-permission ${className}`.trim()} role="alert"><span className="error-state-title">{title}</span>{detail && <span className="error-state-detail">{detail}</span>}{correlation}</div>;
  const variant = kind === "inline" ? "inline" : kind === "action" ? "action" : kind === "connectivity" ? "connectivity" : "section";
  return <div className={`error-state error-state-${variant} ${className}`.trim()} role="alert"><span className="error-state-title">{title}</span>{detail && <span className="error-state-detail">{detail}</span>}{correlation}{action && <span className="error-state-action">{action}</span>}</div>;
}
