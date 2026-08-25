import { useWebUITranslation } from "@webui/sdk/i18n";
import styles from "./openapi.module.css";

// MethodBadge shows the HTTP method token with its semantic color (R075-003):
// the method is a protocol token (not copy), and the tooltip copy is localised.
// The compact variant is used inside tabs.
export function MethodBadge({ method, compact = false }: { method: string; compact?: boolean }) {
  const { t } = useWebUITranslation("webui.openapi");
  return <span className={compact ? styles.methodBadgeCompact : styles.methodBadge} data-method={method.toLowerCase()} title={t("webui.openapi.detail.method", { method })}>{method}</span>;
}