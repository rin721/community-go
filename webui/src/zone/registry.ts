import { lazy, type ComponentType } from "react";
import { webuiZoneRegistry } from "../generated/webui-registry";
import type { ZoneComponentProps, ZoneID } from "@webui/sdk/zone";

type ZoneEntryModule = { default: ComponentType<ZoneComponentProps> };

// zoneLoaders 是生成 registry 的分区索引（zone 标识 -> 贡献 ID -> lazy import）。
// 生成 registry 是唯一允许出现模块 SourcePath import 的构建产物，宿主平台本身
// 不直接 import 业务模块。
const zoneLoaders = webuiZoneRegistry as unknown as Record<ZoneID, Record<string, () => Promise<ZoneEntryModule>>>;

const lazyCache = new Map<string, ReturnType<typeof lazy<ComponentType<ZoneComponentProps>>>>();

// zoneEntryComponent 从生成 registry 解析分区贡献组件并缓存 lazy 组件；
// 未知 zone/贡献（模块被移除或未生成）返回 undefined，由渲染方降级为空。
export function zoneEntryComponent(zone: ZoneID, contributionID: string): ComponentType<ZoneComponentProps> | undefined {
  const key = `${zone}:${contributionID}`;
  const cached = lazyCache.get(key);
  if (cached) return cached;
  const loader = zoneLoaders[zone]?.[contributionID];
  if (!loader) return undefined;
  const component = lazy(loader);
  lazyCache.set(key, component);
  return component;
}