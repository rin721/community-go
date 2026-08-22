import { useId } from "react";
import { translateMessage } from "../../i18n";

// GeometryBlock 是 skeleton 的中性几何单元：只承担布局占位，绝不伪造业务值。
function GeometryRow({ widthClass }: { widthClass: string }) {
  return <span className={`skeleton-geometry-row ${widthClass}`} />;
}

// ShellSkeleton 在 manifest/initial assembly 阶段显示中性 sidebar/header/content 几何，
// 不出现业务值；assembly 错误仍进入 StartupState，由宿主决定最终结果。
export function ShellSkeleton() {
  const titleID = `webui-shell-skeleton-${useId().replaceAll(":", "")}`;
  return <div className="shell-skeleton" role="status" aria-busy="true" aria-labelledby={titleID}>
    <span id={titleID} className="visually-hidden">{translateMessage("webui.host.shell.loading.label")}</span>
    <div className="shell-skeleton-sidebar" aria-hidden="true"><div className="skeleton-geometry skeleton-geometry-brand" /><div className="skeleton-geometry skeleton-geometry-menu"><GeometryRow widthClass="w-90" /><GeometryRow widthClass="w-70" /><GeometryRow widthClass="w-80" /><GeometryRow widthClass="w-60" /></div></div>
    <div className="shell-skeleton-workspace" aria-hidden="true"><div className="skeleton-geometry skeleton-geometry-header" /><div className="skeleton-geometry skeleton-geometry-tabs" /><div className="shell-skeleton-content"><div className="skeleton-geometry skeleton-geometry-title" /><div className="skeleton-geometry skeleton-geometry-summary" /><div className="skeleton-geometry skeleton-geometry-body" /></div></div>
  </div>;
}

// PageSkeleton 在 route locale/lazy entry 阶段保留 PageHeader、summary surface 与主体 surface 的
// 通用几何；不猜测具体模块数据，最终数据由真实页面替换。
export function PageSkeleton() {
  const titleID = `webui-page-skeleton-${useId().replaceAll(":", "")}`;
  return <div className="page-skeleton" role="status" aria-busy="true" aria-labelledby={titleID}>
    <span id={titleID} className="visually-hidden">{translateMessage("webui.host.page.loading.label")}</span>
    <div className="page-skeleton-header" aria-hidden="true"><div className="skeleton-geometry skeleton-geometry-eyebrow" /><div className="skeleton-geometry skeleton-geometry-title" /></div>
    <div className="skeleton-geometry skeleton-geometry-summary" aria-hidden="true" />
    <div className="skeleton-geometry skeleton-geometry-body" aria-hidden="true" />
  </div>;
}