import { readWebUIDataSource } from "@webui/sdk/runtime";
import { translateMessage } from "../../i18n";

// MockBadge 在显式声明 mock 环境时于宿主 topbar 全局渲染“模拟环境”标识，
// 提示所有数据均来自本地 mock、不代表真实服务状态（i18n 双语）。
export function MockBadge() {
  if (readWebUIDataSource() !== "mock") return null;
  return <span className="mock-badge" role="status" title={translateMessage("webui.host.mock.detail")}>{translateMessage("webui.host.mock.badge")}</span>;
}