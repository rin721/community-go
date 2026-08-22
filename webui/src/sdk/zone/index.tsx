import { createContext, useContext, type ReactNode } from "react";
import { useOptionalHostRuntime, type Access, type ManifestZone, type ZoneID } from "../../contracts";

// ZoneComponentProps 是分区注入点组件的受限 props 契约：模块 zone 组件只接收
// contribution（manifest 投影结果）与 navigate（宿主注入的窄导航函数），不得访问
// 宿主 internal、Router singleton 或隐藏全局状态。
export type ZoneComponentProps = {
  contribution: ManifestZone;
  navigate: (path: string) => void;
};

// ZoneRenderer 由宿主平台注入：按 manifest 投影结果渲染模块贡献组件；
// 未知 id 或渲染失败时宿主决定回退（返回 null 或错误占位）。
export type ZoneRenderer = (contribution: ManifestZone) => ReactNode;

const ZoneRendererContext = createContext<ZoneRenderer | undefined>(undefined);

// ZoneRendererProvider 由宿主平台注入分区渲染器（见 webui/src/zone/ZoneRenderer.tsx）。
export { ZoneRendererContext };

// useZoneRenderer 返回宿主注入的分区渲染器；无 Provider 时返回 undefined，
// ZoneSlot 相应渲染为空，保证静态渲染与独立测试不会崩溃。
export function useZoneRenderer(): ZoneRenderer | undefined {
  return useContext(ZoneRendererContext);
}

// ZoneSlot 在宿主注入的渲染器可用时渲染指定分区贡献（懒加载、错误隔离由宿主完成）。
export function ZoneSlot({ contribution }: { contribution: ManifestZone }) {
  const renderer = useZoneRenderer();
  if (!renderer) return null;
  return <>{renderer(contribution)}</>;
}

// useZoneContributions 返回 manifest 中指定分区的已授权注入点（按投影顺序）。
// manifest 缺失或未投影 zones 时返回空数组。
export function useZoneContributions(zone: ZoneID): ManifestZone[] {
  const runtime = useOptionalHostRuntime();
  return (runtime?.manifest.zones ?? []).filter((contribution) => contribution.zone === zone);
}

// useActionAccess 查询动作级权限钩子的运行时 access；未声明/未投影返回 undefined，
// 表示服务端仍强制授权、前端不做呈现限制。denied 用于隐藏/禁用触发器。
export function useActionAccess(operationId: string): Access | undefined {
  const runtime = useOptionalHostRuntime();
  if (!runtime) return undefined;
  const permissions = runtime.manifest.actionPermissions;
  if (!permissions) return undefined;
  const permission = permissions.find((entry) => entry.operationId === operationId);
  return permission?.access;
}

export type { ZoneID, ManifestZone, Access } from "../../contracts";