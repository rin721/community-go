import { useWebUITranslation } from "@webui/sdk/i18n";
import styles from "./openapi.module.css";

// MethodBadge shows the HTTP method token with its semantic color (R075-003):
// the platform SDK has no HTTP-method component; the method itself is a
// protocol token (not user copy), and the tooltip copy is localised.
export function MethodBadge({ method }: { method: string }) {
  const { t } = useWebUITranslation("webui.openapi");
  return <span className={styles.methodBadge} data-method={method.toLowerCase()} title={t("webui.openapi.detail.method", { method })}>{method}</span>;
}