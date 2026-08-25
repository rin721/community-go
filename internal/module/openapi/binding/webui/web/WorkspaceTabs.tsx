import { Tabs } from "@heroui/react";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { MethodBadge } from "./MethodBadge";
import type { OperationRow } from "./openapi-data";
import styles from "./openapi.module.css";

export type WorkspaceTab = { id: string; row: OperationRow };

// WorkspaceTabs is the module-level multi-tab strip (R075-009): each open
// operation is one tab titled "GET /path" with a close button, horizontal
// scroll and the active tab highlighted via HeroUI Tabs (RAC selectedKey).
// The strip reuses the platform workspace-tab visual semantics.
export function WorkspaceTabs({ tabs, activeId, onActivate, onClose }: {
  tabs: WorkspaceTab[];
  activeId?: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const { t } = useWebUITranslation("webui.openapi");
  if (tabs.length === 0) return null;
  return <div className={styles.workspaceTabs}>
    <Tabs selectedKey={activeId} onSelectionChange={(key) => onActivate(String(key))} aria-label={t("webui.openapi.tabs.label")} className={styles.workspaceTabsRoot}>
      <Tabs.List className={styles.workspaceTabsList}>
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.id} id={tab.id} className={styles.workspaceTab}>
            <MethodBadge method={tab.row.method} compact />
            <span className={styles.workspaceTabLabel}>{tab.row.path}</span>
            <button type="button" className={styles.workspaceTabClose} tabIndex={-1} onClick={() => onClose(tab.id)} aria-label={t("webui.openapi.tabs.close")} data-testid={`openapi-tab-close-${tab.row.id}`}>×</button>
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  </div>;
}