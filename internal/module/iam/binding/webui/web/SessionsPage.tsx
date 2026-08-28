import { useCallback, useEffect, useState } from "react";
import { BulkActionBar, Button, CodeText, DataTable, EmptyState, ErrorState, FilterBar, formatDateTime, formatRelativeTime, PageFrame, PageHeader, PageSection, Pagination, ResourceIndex, StatusBadge } from "@webui/sdk/ui";
import { useListQueryParams, type ProblemError } from "@webui/sdk/query";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { listAccounts, listSessions, revokeSessions, type Account, type SessionInfo } from "./api";
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
  const { t: hostT } = useWebUITranslation("webui.host");
  const listQuery = useListQueryParams<{ status: string; accountId: string }>({ filters: { status: { queryKey: "status", defaultValue: "all" }, accountId: { queryKey: "accountId", defaultValue: "", decode: (raw) => raw ?? "" } } });
  const [items, setItems] = useState<SessionInfo[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<ProblemError | null>(null);
  const pageSize = Math.min(Math.max(listQuery.pageSize, 1), 100);
  const [total, setTotal] = useState(0);
  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    const offset = (listQuery.page - 1) * pageSize;
    return listSessions(listQuery.filters.status, listQuery.filters.accountId || undefined, listQuery.sort ? `${listQuery.sort.key}:${listQuery.sort.direction}` : undefined, offset, pageSize).then((result) => { setItems(result.items); setTotal(result.total); setSelected(new Set()); }).catch((error) => { setItems([]); setTotal(0); setSelected(new Set()); setLoadError(error as ProblemError); }).finally(() => setLoading(false));
  }, [listQuery.filters.status, listQuery.filters.accountId, listQuery.sort, listQuery.page, pageSize]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void listAccounts().then((result) => setAccounts(result.items)).catch(() => undefined); }, []);
  const revoke = (): Promise<void> => {
    if (selected.size === 0) return Promise.resolve();
    setRevoking(true);
    return revokeSessions([...selected]).then(() => { setMessage(""); setRevoking(false); refresh(); }).catch(() => { setMessage(t("webui.iam.sessions.conflict")); setRevoking(false); refresh(); });
  };
  return <PageFrame variant="index" className={styles.iamModule}>
    <PageHeader eyebrow={t("webui.iam.access.title")} title={t("webui.iam.sessions.title")} description={t("webui.iam.sessions.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.sessions.list.kicker")} title={t("webui.iam.sessions.list.title")}>
        {message && <p className="page-meta">{message}</p>}
        <ResourceIndex toolbar={<FilterBar
          ariaLabel={t("webui.iam.sessions.statusHeader")}
          fields={[{ key: "accountId", control: "select", label: t("webui.iam.sessions.accountFilter"), value: listQuery.filters.accountId, options: [
            { value: "", label: t("webui.iam.sessions.accountAll") },
            ...accounts.map((item) => ({ value: item.id, label: `${item.displayName} (@${item.username})` })),
          ], onValueChange: (value) => listQuery.setFilters({ ...listQuery.filters, accountId: String(value) }) },
          { key: "status", control: "select", label: t("webui.iam.sessions.statusHeader"), value: listQuery.filters.status, options: [
            { value: "all", label: t("webui.iam.accounts.statusAll") },
            { value: "active", label: t("webui.iam.sessions.active") },
            { value: "revoked", label: t("webui.iam.sessions.revokedAt") },
          ], onValueChange: (value) => listQuery.setFilters({ ...listQuery.filters, status: String(value) }) },
          ]}
          onClear={() => listQuery.clearFilters()}
          clearLabel={t("webui.iam.accounts.clear")}
          resultCount={total}
          resultCountLabel={(count) => `${count} ${hostT("webui.host.ui.results")}`}
        />}>
          {loadError && <ErrorState kind="connectivity" title={hostT("webui.host.route.error.title")} detail={hostT("webui.host.route.error.detail")} requestId={loadError.requestId} action={<Button variant="secondary" onClick={() => void refresh()}>{hostT("webui.host.retry")}</Button>} />}
          <DataTable<SessionInfo>
          columns={[
            { id: "idHash", header: t("webui.iam.sessions.idHash"), cell: (item) => <CodeText value={item.idHash} copyable /> },
            { id: "createdAt", header: t("webui.iam.sessions.createdAt"), cell: (item) => <span title={formatDateTime(item.createdAt)}>{formatRelativeTime(item.createdAt, hostT)}</span> },
            { id: "lastSeenAt", header: t("webui.iam.sessions.lastSeenAt"), cell: (item) => <span title={formatDateTime(item.lastSeenAt)}>{formatRelativeTime(item.lastSeenAt, hostT)}</span> },
            { id: "idleExpiresAt", header: t("webui.iam.sessions.idleExpiresAt"), cell: (item) => <span title={formatDateTime(item.idleExpiresAt)}>{formatRelativeTime(item.idleExpiresAt, hostT)}</span> },
            { id: "absoluteExpiresAt", header: t("webui.iam.sessions.absoluteExpiresAt"), cell: (item) => <span title={formatDateTime(item.absoluteExpiresAt)}>{formatRelativeTime(item.absoluteExpiresAt, hostT)}</span> },
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
          emptyState={loadError ? null : <EmptyState title={t("webui.iam.sessions.empty")} />}
          enhancements={{ density: "default", stickyHeader: true }}
          />
          <Pagination
            page={listQuery.page}
            pageCount={Math.max(1, Math.ceil(total / pageSize))}
            total={total}
            totalLabel={(count) => `${count} ${hostT("webui.host.ui.results")}`}
            pageLabel={(current) => `Page ${current}`}
            previousLabel={t("webui.auth.audit.previous")}
            nextLabel={t("webui.auth.audit.next")}
            paginationLabel={t("webui.auth.audit.pagination")}
            pageSize={pageSize}
            pageSizeOptions={[20, 50, 100]}
            pageSizeLabel={t("webui.auth.audit.pageSize")}
            onPageChange={listQuery.setPage}
            onPageSizeChange={listQuery.setPageSize}
          />
          <BulkActionBar
          open={items.length > 0}
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
          disabled={selected.size === 0}
          disabledReason="invalid"
          onConfirm={revoke}
            onClear={() => setSelected(new Set())}
          />
        </ResourceIndex>
      </PageSection>
    </div>
  </PageFrame>;
}
