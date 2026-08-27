import { useCallback, useEffect, useState } from "react";
import { BulkActionBar, CodeText, DataTable, formatDateTime, PageHeader, PageSection, StatusBadge } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { listSessions, revokeSessions, type SessionInfo } from "./api";
import styles from "./iam.module.css";

// toggleSelection returns an immutable copy of the selection with the id
// toggled; shared by the page render and unit tests.
export const toggleSelection = (current: Set<string>, id: string): Set<string> => {
  const next = new Set(current);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
};

// 082 REQ-082-021: session status cell without inline ternaries in JSX.
type Translate = (key: string, params?: Record<string, string | number>) => string;
export function sessionStatusCell(item: SessionInfo, t: Translate) {
  if (item.revokedAt) return <StatusBadge status="revoked">{t("webui.iam.sessions.revokedAt")}</StatusBadge>;
  return <StatusBadge status="active">{t("webui.iam.sessions.active")}</StatusBadge>;
}

export default function SessionsPage() {
  const { t } = useWebUITranslation("webui.iam");
  const [items, setItems] = useState<SessionInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState(false);
  const refresh = useCallback(() => {
    void listSessions().then((result) => { setItems(result.items); setSelected(new Set()); });
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const revoke = (): Promise<void> => {
    if (selected.size === 0) return Promise.resolve();
    setRevoking(true);
    return revokeSessions([...selected]).then(() => { setMessage(""); setRevoking(false); refresh(); }).catch(() => { setMessage(t("webui.iam.sessions.conflict")); setRevoking(false); refresh(); });
  };
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.access.title")} title={t("webui.iam.sessions.title")} description={t("webui.iam.sessions.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.sessions.list.kicker")} title={t("webui.iam.sessions.list.title")}>
        {message && <p className="page-meta">{message}</p>}
        <DataTable<SessionInfo>
          columns={[
            { id: "idHash", header: t("webui.iam.sessions.idHash"), cell: (item) => <CodeText value={item.idHash} copyable /> },
            { id: "createdAt", header: t("webui.iam.sessions.createdAt"), cell: (item) => <CodeText value={formatDateTime(item.createdAt)} /> },
            { id: "lastSeenAt", header: t("webui.iam.sessions.lastSeenAt"), cell: (item) => <CodeText value={formatDateTime(item.lastSeenAt)} /> },
            { id: "idleExpiresAt", header: t("webui.iam.sessions.idleExpiresAt"), cell: (item) => <CodeText value={formatDateTime(item.idleExpiresAt)} /> },
            { id: "absoluteExpiresAt", header: t("webui.iam.sessions.absoluteExpiresAt"), cell: (item) => <CodeText value={formatDateTime(item.absoluteExpiresAt)} /> },
            { id: "status", header: t("webui.iam.sessions.statusHeader"), cell: (item) => sessionStatusCell(item, t) },
          ]}
          rows={items}
          ariaLabel={t("webui.iam.sessions.list.title")}
          getRowKey={(item) => item.idHash}
          selectable
          selectionLabel={t("webui.iam.sessions.selectAll")}
          selectedKeys={selected}
          onSelectedKeysChange={setSelected}
          emptyState={<p className="page-meta">{t("webui.iam.sessions.empty")}</p>}
          enhancements={{ density: "default", stickyHeader: true }}
        />
        <BulkActionBar
          open={selected.size > 0}
          selectionLabel={t("webui.iam.sessions.selection", { count: selected.size })}
          actionLabel={t("webui.iam.sessions.revoke")}
          clearLabel={t("webui.iam.sessions.clearSelection")}
          confirmTitle={t("webui.iam.sessions.confirmRevokeTitle")}
          confirmDescription={t("webui.iam.sessions.confirmRevokeDetail")}
          confirmLabel={t("webui.iam.sessions.revoke")}
          cancelLabel={t("webui.iam.cancel")}
          closeLabel={t("webui.iam.cancel")}
          pending={revoking}
          pendingLabel={t("webui.iam.saving")}
          onConfirm={revoke}
          onClear={() => setSelected(new Set())}
        />
      </PageSection>
    </div>
  </div>;
}