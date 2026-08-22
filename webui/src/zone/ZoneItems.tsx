import { useZoneContributions, ZoneSlot, type ZoneID } from "@webui/sdk/zone";

// ZoneItems 渲染宿主骨架某分区的全部已授权贡献（按 manifest 投影顺序）。
// 宿主组件通过它消费分区注入点，不直接 import 业务模块。
export function ZoneItems({ zone }: { zone: ZoneID }) {
  const contributions = useZoneContributions(zone);
  if (contributions.length === 0) return null;
  return <>{contributions.map((contribution) => <ZoneSlot key={contribution.id} contribution={contribution} />)}</>;
}