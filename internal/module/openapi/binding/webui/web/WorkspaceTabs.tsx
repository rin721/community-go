import { useWebUITranslation } from "@webui/sdk/i18n";
import { MethodBadge } from "./MethodBadge";
import type { OperationRow } from "./openapi-data";
import styles from "./openapi.module.css";

export type WorkspaceTab = {
  key: string;
  kind: "home" | "operation" | "model";
  operation?: OperationRow;
  model?: string;
  mode: "docs" | "debug";
};

// WorkspaceTabs renders the Apifox-style tab bar (R075-005): a fixed home tab
// plus one tab per opened operation/model with a close affordance; the active
// tab is highlighted and closable.
export function WorkspaceTabs({ tabs, activeKey, onActivate, onClose }: {
  tabs: WorkspaceTab[];
  activeKey: string;
  onActivate: (key: string) => void;
  onClose: (key: string) => void;
}) {
  const { t } = useWebUITranslation("webui.openapi");
  return <div className={styles.tabBar} role="tablist" aria-label={t("webui.openapi.tabs.workspace")}>
    {tabs.map((tab) => {
      const active = tab.key === activeKey;
      const label = tab.kind === "home" ? t("webui.openapi.tabs.home") : tab.kind === "model" ? tab.model ?? "" : tab.operation?.operationId ?? "";
      return (
        <div key={tab.key} className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab} role="presentation">
          <button
            type="button"
            role="tab"
            aria-selected={active}
            className={styles.tabButton}
            data-testid={tab.kind === "home" ? "openapi-tab-home" : `openapi-tab-${tab.key}`}
            onClick={() => onActivate(tab.key)}
          >
            {tab.kind === "operation" && tab.operation && <MethodBadge method={tab.operation.method} compact />}
            <span className={styles.tabLabel}>{label}</span>
          </button>
          {tab.kind !== "home" && (
            <button
              type="button"
              className={styles.tabClose}
              aria-label={t("webui.openapi.tabs.close")}
              onClick={() => onClose(tab.key)}
            >
              ×
            </button>
          )}
        </div>
      );
    })}
  </div>;
}