import { useCallback, useEffect, useState } from "react";
import { BulkActionBar, CodeText, DataTable, EmptyState, FilterBar, formatDateTime, PageHeader, PageSection, SelectField, StatusBadge } from "@webui/sdk/ui";
import { useListQueryParams } from "@webui/sdk/query";
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
  const listQuery = useListQueryParams<{ status: string }>({ filters: { status: { queryKey: "status", defaultValue: "all" } } });
  const [items, setItems] = useState<SessionInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(() => {
    setLoading(true);
    return listSessions(listQuery.filters.status, listQuery.sort ? `${listQuery.sort.key}:${listQuery.sort.direction}` : undefined).then((result) => { setItems(result.items); setSelected(new Set()); }).finally(() => setLoading(false));
  }, [listQuery.filters.status, listQuery.sort]);
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
        <FilterBar
          ariaLabel={t("webui.iam.sessions.statusHeader")}
          fields={[{ key: "status", control: "select", label: t("webui.iam.sessions.statusHeader"), value: listQuery.filters.status, options: [
            { value: "all", label: t("webui.iam.accounts.statusAll") },
            { value: "active", label: t("webui.iam.sessions.active") },
            { value: "revoked", label: t("webui.iam.sessions.revokedAt") },
          ], onValueChange: (value) => listQuery.setFilters({ status: String(value) }) }]}
          onClear={() => listQuery.clearFilters()}
          clearLabel={t("webui.iam.accounts.clear")}
        />
        <div className="toolbar accounts-sort-bar">
          <SelectField label={t("webui.iam.accounts.sortBy")} value={listQuery.sort?.key ?? ""} options={[
            { value: "", label: t("webui.iam.accounts.sortNone") },
            { value: "createdAt", label: t("webui.iam.sessions.createdAt") },
            { value: "lastSeenAt", label: t("webui.iam.sessions.lastSeenAt") },
            { value: "idleExpiresAt", label: t("webui.iam.sessions.idleExpiresAt") },
          ]} onValueChange={(value) => listQuery.setSort(value ? { key: value, direction: listQuery.sort?.direction ?? "desc" } : null)} />
          {listQuery.sort && <SelectField label={t("webui.iam.accounts.sortDirection")} value={listQuery.sort.direction} options={[
            { value: "asc", label: t("webui.iam.accounts.sortAsc") },
            { value: "desc", label: t("webui.iam.accounts.sortDesc") },
          ]} onValueChange={(value) => listQuery.setSort({ key: listQuery.sort?.key ?? "createdAt", direction: value === "desc" ? "desc" : "asc" })} />}
        </div>
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
          loading={loading}
          loadingLabel={t("webui.host.page.loading.label")}
          getRowKey={(item) => item.idHash}
          selectable
          selectionLabel={t("webui.iam.sessions.selectAll")}
          selectedKeys={selected}
          onSelectedKeysChange={setSelected}
          emptyState={<EmptyState title={t("webui.iam.sessions.empty")} />}
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
