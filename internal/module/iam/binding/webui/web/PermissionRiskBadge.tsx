import { useWebUITranslation } from "@webui/sdk/i18n";
import { StatusBadge } from "@webui/sdk/ui";
import type { PermissionRisk } from "./api";

// PermissionRiskBadge 统一呈现权限 owner 声明的风险等级；调用方只消费
// Catalog 元数据，不按权限键或操作名称自行推断颜色和文案。
export function PermissionRiskBadge({ risk }: { risk: PermissionRisk }) {
  const { t } = useWebUITranslation("webui.iam");
  const status = risk === "critical" ? "failed" : risk === "elevated" ? "degraded" : "inactive";
  return <StatusBadge status={status}>{t(`webui.iam.permissions.risk.${risk}`)}</StatusBadge>;
}
