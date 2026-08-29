import { IconButton, Tabs } from "@webui/sdk/ui";
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
    <Tabs selectedKey={activeId} onSelectionChange={onActivate} label={t("webui.openapi.tabs.label")} className={styles.workspaceTabsRoot} listClassName={styles.workspaceTabsList} tabClassName={styles.workspaceTab} items={tabs.map((tab) => ({ id: tab.id, content: null, label: <>
            <MethodBadge method={tab.row.method} compact />
            <span className={styles.workspaceTabLabel}>{tab.row.path}</span>
            <IconButton className={styles.workspaceTabClose} onClick={() => onClose(tab.id)} label={t("webui.openapi.tabs.close")} data={{ "data-testid": `openapi-tab-close-${tab.row.id}` }}>×</IconButton>
          </> }))} />
  </div>;
}
