import { Component, Suspense, useCallback, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ZoneRendererContext, type ManifestZone, type ZoneRenderer } from "@webui/sdk/zone";
import { zoneEntryComponent } from "./registry";

// ZoneErrorBoundary 隔离单个分区贡献的渲染/加载错误：zone 失败只裁剪该贡献，
// 不拖垮 Shell 与其他模块；错误在控制台保持可诊断，页面呈现降级为空槽。
class ZoneErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state: { hasError: boolean } = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

// ZoneEntry 懒装载分区贡献组件并以受限 props（contribution + navigate）注入。
function ZoneEntry({ contribution }: { contribution: ManifestZone }) {
  const navigate = useNavigate();
  const Component = useMemo(() => zoneEntryComponent(contribution.zone, contribution.id), [contribution.zone, contribution.id]);
  if (!Component) return null;
  return (
    <ZoneErrorBoundary>
      <Suspense fallback={<span className="zone-slot-loading" aria-hidden="true" />}>
        <Component contribution={contribution} navigate={navigate} />
      </Suspense>
    </ZoneErrorBoundary>
  );
}

// ZoneRendererProvider 是宿主对 SDK zone 能力的注入点：为整棵路由树提供
// manifest 驱动的分区渲染器。必须位于需要渲染 zone 的子树外层。
export function ZoneRendererProvider({ children }: { children: ReactNode }) {
  const renderer = useCallback<ZoneRenderer>((contribution) => <ZoneEntry key={contribution.id} contribution={contribution} />, []);
  return <ZoneRendererContext.Provider value={renderer}>{children}</ZoneRendererContext.Provider>;
}