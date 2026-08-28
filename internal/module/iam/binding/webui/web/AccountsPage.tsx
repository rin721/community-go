import { useCallback, useEffect, useState } from "react";
import { ActionTrigger, BatchResultSummary, Button, BulkActionBar, Check, CodeText, ConfirmActionTrigger, DataTable, DetailDrawer, Drawer, EmptyState, EntityDetail, ErrorState, Field, FilterBar, FormField, PageFrame, PageHeader, PageSection, Pagination, ResourceIndex, SearchInput, StatusBadge, StickyActionBar } from "@webui/sdk/ui";
import { useListQueryParams, type ProblemError } from "@webui/sdk/query";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { accountRolesView, archiveAccount, batchAccountStatus, batchArchiveAccounts, createAccount, listAccounts, listRoles, replaceAccountRoles, resetAccountPassword, setAccountStatus, updateAccountInfo, type Account, type Role } from "./api";
import styles from "./iam.module.css";

// checklistCandidates only exposes active, non-archived roles for assignment.
export const checklistCandidates = (roles: Role[]) => roles.filter((role) => role.active && !role.archived);

// 082 REQ-082-012: table cell renderers (keep JSX free of inline ternaries).
type Translate = (key: string, params?: Record<string, string | number>) => string;
export function accountStatusCell(item: Account, t: Translate) {
  if (item.archived) return <StatusBadge status="revoked">{t("webui.iam.accounts.archived")}</StatusBadge>;
  const active = item.status === "active";
  return <StatusBadge status={active ? "active" : "disabled"}>{t(active ? "webui.iam.accounts.statusActive" : "webui.iam.accounts.statusDisabled")}</StatusBadge>;
}
export function accountSecurityCell(item: Account, t: Translate) {
  if (item.mustChangePassword) return <StatusBadge status="pending">{t("webui.iam.security.changeRequired")}</StatusBadge>;
  return <CodeText value={String(item.securityRevision)} />;
}

export function sameRoleIDs(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  if (left.length !== right.length) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

const PAGE_SIZE = 10;

export default function AccountsPage() {
  const { t } = useWebUITranslation("webui.iam");
  const { t: hostT } = useWebUITranslation("webui.host");
  // 082 REQ-082-012/002: list state URL-ized (query refresh keeps context).
  const listQuery = useListQueryParams<{ query: string; status: string; archived: boolean; roleId: string }>({
    filters: {
      query: { queryKey: "query", defaultValue: "" },
      status: { queryKey: "status", defaultValue: "", decode: (raw) => raw ?? "" },
      archived: { queryKey: "archived", defaultValue: false, decode: (raw) => raw === "true" },
      roleId: { queryKey: "roleId", defaultValue: "", decode: (raw) => raw ?? "" },
    },
  });
  const [items, setItems] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkErrors, setBulkErrors] = useState<Array<{ accountId: string; code: string }>>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [roleIDs, setRoleIDs] = useState<string[]>([]);
  const [savedRoleIDs, setSavedRoleIDs] = useState<string[]>([]);
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [roleSaveState, setRoleSaveState] = useState<"clean" | "dirty" | "pending" | "conflict">("clean");
  const [roleSaving, setRoleSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [total, setTotal] = useState(0);
  const [renameValue, setRenameValue] = useState("");
  const [archiveError, setArchiveError] = useState(false);
  const [detailAccount, setDetailAccount] = useState<Account | null>(null);
  const [detailAccountID, setDetailAccountID] = useState("");
  const [detailRoleIDs, setDetailRoleIDs] = useState<string[] | null>(null);
  const [detailRoleError, setDetailRoleError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<ProblemError | null>(null);
  const page = listQuery.page;
  const sortKey = listQuery.sort?.key;
  const sortDirection = listQuery.sort?.direction;
  const refresh = useCallback((nextPage = page) => {
    setLoading(true);
    setLoadError(null);
    const status = listQuery.filters.status === "active" || listQuery.filters.status === "disabled" ? listQuery.filters.status : undefined;
    const sortMap: Record<string, string> = { displayName: "display_name", username: "username", status: "status" };
    const mappedSortKey = sortKey ? sortMap[sortKey] : undefined;
    const sort = mappedSortKey && sortDirection ? `${mappedSortKey}:${sortDirection}` : undefined;
    return listAccounts(listQuery.filters.query, (nextPage - 1) * PAGE_SIZE, PAGE_SIZE, { status, archived: listQuery.filters.archived, roleId: listQuery.filters.roleId || undefined, sort }).then((result) => {
      setTotal(result.total);
      setItems(result.items);
      setSelectedID((current) => current && result.items.some((item) => item.id === current) ? current : result.items[0]?.id || "");
    }).catch((error) => { setItems([]); setTotal(0); setLoadError(error as ProblemError); }).finally(() => setLoading(false));
  }, [listQuery.filters.query, listQuery.filters.status, listQuery.filters.archived, listQuery.filters.roleId, sortKey, sortDirection, page]);
  useEffect(() => { void refresh(); void listRoles().then((result) => setRoles(result.items)); }, [refresh]);
  useEffect(() => { listQuery.setPage(1); }, [listQuery.filters.query, listQuery.filters.status, listQuery.filters.archived, listQuery.filters.roleId, sortKey, sortDirection]);
  const reloadSelection = useCallback((id: string, preserveMessage = false): Promise<void> => {
    if (!id) return Promise.resolve();
    if (id === detailAccountID) { setDetailRoleIDs(null); setDetailRoleError(false); }
    return accountRolesView(id).then((view) => {
      setRoleIDs(view.roleIds);
      setSavedRoleIDs(view.roleIds);
      setExpectedVersion(view.accountVersion);
      setRoleSaveState("clean");
      if (id === detailAccountID) setDetailRoleIDs(view.roleIds);
      if (!preserveMessage) {
        setRenameValue("");
        setMessage("");
        setArchiveError(false);
      }
    }).catch(() => {
      if (id === detailAccountID) setDetailRoleError(true);
      return undefined;
    });
  }, [detailAccountID]);
  useEffect(() => { if (selectedID) void reloadSelection(selectedID); }, [selectedID, reloadSelection]);
  const selected = items.find((item) => item.id === selectedID);
  const candidates = checklistCandidates(roles);
  const roleDirty = Boolean(selected) && !sameRoleIDs(roleIDs, savedRoleIDs);
  const toggle = (id: string) => {
    setMessage("");
    setRoleIDs((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      setRoleSaveState(sameRoleIDs(next, savedRoleIDs) ? "clean" : "dirty");
      return next;
    });
  };
  const save = (): Promise<void> => {
    if (!selected || roleSaving || !roleDirty) return Promise.resolve();
    setRoleSaving(true);
    setRoleSaveState("pending");
    return replaceAccountRoles(selected.id, expectedVersion, roleIDs).then((result) => {
      setMessage(`${t("webui.iam.accounts.saved")} +${result.added} −${result.removed}`);
      return reloadSelection(selected.id, true);
    }).catch(() => {
      return accountRolesView(selected.id).then((view) => {
        const added = view.roleIds.filter((id) => !roleIDs.includes(id)).length;
        const removed = roleIDs.filter((id) => !view.roleIds.includes(id)).length;
        setMessage(t("webui.iam.accounts.conflictResolve", { added, removed }));
        setRoleIDs(view.roleIds);
        setSavedRoleIDs(view.roleIds);
        setExpectedVersion(view.accountVersion);
        setRoleSaveState("conflict");
      });
    }).finally(() => setRoleSaving(false));
  };
  const rename = () => {
    if (!selected || !renameValue.trim()) return;
    void updateAccountInfo(selected.id, selected.version, renameValue.trim()).then(() => {
      setMessage(t("webui.iam.accounts.nameUpdated"));
      return refresh();
    }).catch(() => { void refresh(); });
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // 082 REQ-082-012: DataTable row menu (real operations only, disabled by state).
  const rowActions = (account: Account) => {
    const actions: Array<{ key: string; label: string; onSelect: () => void; danger?: boolean }> = [];
    actions.push({ key: "detail", label: t("webui.iam.accounts.detail"), onSelect: () => { setDetailAccountID(account.id); setDetailRoleIDs(null); setDetailRoleError(false); setSelectedID(account.id); setDetailAccount(account); } });
    actions.push({ key: "select", label: t("webui.iam.accounts.select"), onSelect: () => setSelectedID(account.id) });
    if (!account.archived) {
      actions.push({ key: "status", label: account.status === "active" ? t("webui.iam.accounts.disable") : t("webui.iam.accounts.enable"), onSelect: () => void setAccountStatus(account.id, account.status === "active" ? "disabled" : "active").then(() => refresh()) });
      actions.push({ key: "archive", label: t("webui.iam.accounts.archive"), danger: true, onSelect: () => void archiveAccount(account.id).then(() => refresh()).catch(() => setArchiveError(true)) });
    }
    return actions;
  };
  return <PageFrame variant="index" className={styles.iamModule}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.accounts.title")} description={t("webui.iam.accounts.description")} actions={<ActionTrigger operationId="iam.accounts.create" onAction={() => setCreateOpen(true)}>{t("webui.iam.accounts.create.title")}</ActionTrigger>} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.accounts.list.kicker")} title={t("webui.iam.accounts.list.title")} footer={<Pagination
        page={page}
        pageCount={pages}
        total={total}
        totalLabel={(count) => t("webui.iam.accounts.total", { total: count })}
        pageLabel={(current) => t("webui.iam.accounts.pagination", { page: current, total })}
        paginationLabel={t("webui.iam.accounts.pagination", { page, total })}
        previousLabel={t("webui.auth.audit.previous")}
        nextLabel={t("webui.auth.audit.next")}
        onPageChange={(nextPage) => listQuery.setPage(nextPage)}
      />}>
        <ResourceIndex aria-label={t("webui.iam.accounts.list.title")} toolbar={<FilterBar
          ariaLabel={t("webui.iam.accounts.filter")}
          fields={[
            { key: "status", label: t("webui.iam.accounts.statusFilter"), control: "select", options: [
              { value: "", label: t("webui.iam.accounts.statusAll") },
              { value: "active", label: t("webui.iam.accounts.statusActive") },
              { value: "disabled", label: t("webui.iam.accounts.statusDisabled") },
            ], value: listQuery.filters.status, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, status: String(next) }) },
            { key: "archived", label: t("webui.iam.accounts.archivedFilter"), control: "switch", value: listQuery.filters.archived, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, archived: Boolean(next) }) },
            { key: "roleId", label: t("webui.iam.accounts.roleFilter"), control: "select", options: [
              { value: "", label: t("webui.iam.accounts.roleAll") },
              ...checklistCandidates(roles).map((role) => ({ value: role.id, label: `${role.name} (${role.code})` })),
            ], value: listQuery.filters.roleId, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, roleId: String(next) }) },
          ]}
          trailingFields={[
            { key: "sortBy", label: t("webui.iam.accounts.sortBy"), control: "select", active: Boolean(listQuery.sort?.key), options: [
              { value: "", label: t("webui.iam.accounts.sortNone") },
              { value: "displayName", label: t("webui.iam.displayName") },
              { value: "username", label: t("webui.iam.username") },
              { value: "status", label: t("webui.iam.accounts.tableStatus") },
            ], value: listQuery.sort?.key ?? "", onValueChange: (value) => listQuery.setSort(String(value) ? { key: String(value), direction: listQuery.sort?.direction ?? "asc" } : null) },
            { key: "sortDir", label: t("webui.iam.accounts.sortDirection"), control: "select", active: Boolean(listQuery.sort?.key), options: [
              { value: "asc", label: t("webui.iam.accounts.sortAsc") },
              { value: "desc", label: t("webui.iam.accounts.sortDesc") },
            ], value: listQuery.sort?.direction ?? "desc", onValueChange: (value) => { if (listQuery.sort) listQuery.setSort({ key: listQuery.sort.key, direction: value === "desc" ? "desc" : "asc" }); } },
          ]}
          searchInput={<SearchInput value={listQuery.filters.query} onChange={(next) => listQuery.setFilters({ ...listQuery.filters, query: next })} placeholder={t("webui.iam.search")} label={t("webui.iam.accounts.filter")} />}
          onClear={() => listQuery.clearFilters()}
          clearLabel={t("webui.iam.accounts.clear")}
          resultCount={total}
          resultCountLabel={(count) => t("webui.iam.accounts.total", { total: count })}
        />}>
        {loadError && <ErrorState kind="connectivity" title={hostT("webui.host.route.error.title")} detail={hostT("webui.host.route.error.detail")} requestId={loadError.requestId} action={<Button variant="secondary" onClick={() => void refresh()}>{hostT("webui.host.retry")}</Button>} />}
        <DataTable<Account>
          columns={[
            { id: "displayName", header: t("webui.iam.displayName"), cell: (item) => item.displayName },
            { id: "username", header: t("webui.iam.username"), cell: (item) => <CodeText value={item.username} /> },
            { id: "status", header: t("webui.iam.accounts.tableStatus"), cell: (item) => accountStatusCell(item, t) },
            { id: "security", header: t("webui.iam.accounts.tableRevision"), cell: (item) => accountSecurityCell(item, t) },
          ]}
          rows={items}
          ariaLabel={t("webui.iam.accounts.list.title")}
          loading={loading}
          loadingLabel={t("webui.host.page.loading.label")}
          getRowKey={(item) => item.id}
          selectable
          selectionLabel={t("webui.iam.accounts.selectAll")}
          selectedKeys={selection}
          onSelectedKeysChange={setSelection}
          emptyState={loadError ? null : <EmptyState title={t("webui.iam.accounts.empty")} />}
          enhancements={{
            density: "default",
            stickyHeader: true,
            rowMenuHeader: t("webui.iam.accounts.actions"),
            renderRowMenu: rowActions,
          }}
        />
        <BatchResultSummary summary={bulkMessage} errors={bulkErrors.map((item) => ({ key: item.accountId, code: item.code }))} errorsLabel={t("webui.iam.error")} />
        <BulkActionBar
          open={items.length > 0}
          selectionLabel={t("webui.iam.accounts.selection", { count: selection.size })}
          actionLabel={selection.size > 0 && [...selection].every((id) => items.find((item) => item.id === id)?.status === "disabled") ? t("webui.iam.accounts.bulkEnable") : t("webui.iam.accounts.bulkDisable")}
          clearLabel={t("webui.iam.accounts.clearSelection")}
          confirmTitle={t("webui.iam.accounts.bulkStatusTitle")}
          confirmDescription={t("webui.iam.accounts.bulkStatusDetail", { count: selection.size, status: selection.size > 0 && [...selection].every((id) => items.find((item) => item.id === id)?.status === "disabled") ? t("webui.iam.accounts.statusActive") : t("webui.iam.accounts.statusDisabled") })}
          confirmLabel={t("webui.iam.accounts.bulkDisable")}
          cancelLabel={t("webui.iam.cancel")}
          closeLabel={t("webui.iam.cancel")}
          pending={bulkBusy}
          pendingLabel={t("webui.iam.saving")}
          disabled={selection.size === 0}
          disabledReason="invalid"
          extraActions={[{
            key: "archive",
            label: t("webui.iam.accounts.bulkArchive"),
            variant: "danger",
            confirmTitle: t("webui.iam.accounts.bulkArchiveTitle"),
            confirmDescription: t("webui.iam.accounts.bulkArchiveDetail", { count: selection.size }),
            confirmLabel: t("webui.iam.accounts.bulkArchive"),
            onConfirm: () => {
              setBulkBusy(true);
              return batchArchiveAccounts([...selection]).then((result) => {
                setBulkBusy(false);
                setBulkMessage(t("webui.iam.accounts.bulkArchived", { count: result.processed }));
                setBulkErrors(result.errors ?? []);
                setSelection(new Set());
                return refresh();
              }).catch(() => { setBulkBusy(false); setBulkMessage(t("webui.iam.error")); return Promise.resolve(); });
            },
          }]}
          onConfirm={() => {
            const targetStatus: Account["status"] = [...selection].every((id) => items.find((item) => item.id === id)?.status === "disabled") ? "active" : "disabled";
            setBulkBusy(true);
            return batchAccountStatus([...selection], targetStatus).then((result) => {
              setBulkBusy(false);
              setBulkMessage(t("webui.iam.accounts.bulkResult", { processed: result.processed, failed: result.failed }));
              setBulkErrors(result.errors ?? []);
              setSelection(new Set());
              return refresh();
            }).catch(() => { setBulkBusy(false); setBulkMessage(t("webui.iam.error")); return Promise.resolve(); });
          }}
          onClear={() => setSelection(new Set())}
        />
        </ResourceIndex>
      </PageSection>
      {selected && (
        <PageSection kicker={t("webui.iam.accounts.manage.kicker")} title={t("webui.iam.accounts.manage.title")}>
          <EntityDetail header={<div className="entity-detail-header-row"><div className="entity-detail-identity"><strong>{selected.displayName}</strong><CodeText value={`@${selected.username}`} /></div><StatusBadge status={selected.archived ? "revoked" : selected.status === "active" ? "active" : "disabled"}>{selected.archived ? t("webui.iam.accounts.archived") : selected.status === "active" ? t("webui.iam.accounts.statusActive") : t("webui.iam.accounts.statusDisabled")}</StatusBadge></div>}>
            <div className="page-meta">{t("webui.iam.accounts.revision")} rev {expectedVersion}</div>
            <div className="role-checklist">{candidates.map((role) => <Check key={role.id} checked={roleIDs.includes(role.id)} disabled={selected.archived} onChange={() => toggle(role.id)} className="permission-row">{role.name} ({role.code})</Check>)}</div>
            {message && <p className="page-meta">{message}</p>}
            <StickyActionBar state={roleSaveState} status={roleSaveState === "dirty" ? t("webui.iam.roles.pending") : roleSaveState === "pending" ? t("webui.iam.saving") : roleSaveState === "conflict" ? message : undefined}>
              <ActionTrigger operationId="iam.accounts.roles.replace" pending={roleSaving} pendingLabel={t("webui.iam.saving")} disabled={selected.archived || !roleDirty} disabledReason={roleSaving ? "busy" : !roleDirty ? "invalid" : undefined} onAction={save}>{t("webui.iam.accounts.saveRoles")}</ActionTrigger>
              <ActionTrigger operationId="iam.accounts.status" variant="secondary" disabled={selected.archived} onAction={() => selected ? setAccountStatus(selected.id, selected.status === "active" ? "disabled" : "active").then(() => refresh()) : undefined}>{selected.status === "active" ? t("webui.iam.accounts.disable") : t("webui.iam.accounts.enable")}</ActionTrigger>
            </StickyActionBar>
            <div className="toolbar">
              <Field label={t("webui.iam.accounts.resetPassword")} type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
              <ActionTrigger operationId="iam.accounts.password.reset" disabled={selected.archived || resetPassword.length < 15} onAction={() => selected ? resetAccountPassword(selected.id, resetPassword).then(() => setResetPassword("")) : undefined}>{t("webui.iam.accounts.reset")}</ActionTrigger>
              <Field label={t("webui.iam.displayName")} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
              <ActionTrigger operationId="iam.accounts.update" disabled={selected.archived || !renameValue.trim()} onAction={rename}>{t("webui.iam.accounts.editName")}</ActionTrigger>
              <ConfirmActionTrigger
                operationId="iam.accounts.archive"
                variant="danger"
                disabled={selected.archived}
                label={t("webui.iam.accounts.archive")}
                pendingLabel={t("webui.iam.saving")}
                confirmTitle={t("webui.iam.accounts.confirmArchive")}
                confirmDescription={t("webui.iam.accounts.archiving")}
                confirmLabel={t("webui.iam.accounts.archive")}
                cancelLabel={t("webui.iam.cancel")}
                closeLabel={t("webui.iam.cancel")}
                onConfirm={() => selected ? archiveAccount(selected.id).then(() => refresh()) : Promise.resolve()}
              />
              {archiveError && <p className="page-meta">{t("webui.iam.error")}</p>}
            </div>
          </EntityDetail>
        </PageSection>
      )}
    </div>
    <Drawer open={createOpen} title={t("webui.iam.accounts.create.title")} closeLabel={t("webui.iam.cancel")} onClose={() => setCreateOpen(false)}>
      <div className="toolbar drawer-form">
        <FormField label={t("webui.iam.username")} htmlFor="account-username" control={<Field id="account-username" label={t("webui.iam.username")} value={username} onChange={(event) => setUsername(event.target.value)} />} />
        <FormField label={t("webui.iam.displayName")} htmlFor="account-name" control={<Field id="account-name" label={t("webui.iam.displayName")} value={name} onChange={(event) => setName(event.target.value)} />} />
        <FormField label={t("webui.iam.password")} htmlFor="account-password" control={<Field id="account-password" label={t("webui.iam.password")} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />} />
        <div className="toolbar-actions">
          <ActionTrigger operationId="iam.accounts.create" pendingLabel={t("webui.iam.saving")} onAction={() => void createAccount(username, name, password).then(() => { setUsername(""); setName(""); setPassword(""); setCreateOpen(false); return refresh(); }).catch(() => setMessage(t("webui.iam.error")))}>{t("webui.iam.create")}</ActionTrigger>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t("webui.iam.cancel")}</Button>
        </div>
      </div>
    </Drawer>
    {/* 082 REQ-082-013: User Detail Drawer (Overview/Roles; sessions/security via existing pages; no fake activity) */}
    <DetailDrawer
      open={Boolean(detailAccount)}
      onClose={() => setDetailAccount(null)}
      title={detailAccount ? detailAccount.displayName : ""}
      identity={detailAccount ? t("webui.iam.accounts.detailIdentity", { username: `@${detailAccount.username}` }) : undefined}
      status={detailAccount ? (detailAccount.archived ? <StatusBadge status="revoked">{t("webui.iam.accounts.archived")}</StatusBadge> : <StatusBadge status={detailAccount.status === "active" ? "active" : "disabled"}>{t(detailAccount.status === "active" ? "webui.iam.accounts.statusActive" : "webui.iam.accounts.statusDisabled")}</StatusBadge>) : undefined}
      width={560}
    >
      {detailAccount && (
        <div className="user-detail">
          <div className="detail-field"><span className="detail-field-label">{t("webui.iam.username")}</span><CodeText value={detailAccount.username} /></div>
          <div className="detail-field"><span className="detail-field-label">{t("webui.iam.displayName")}</span><span className="detail-field-value">{detailAccount.displayName}</span></div>
          <div className="detail-field"><span className="detail-field-label">{t("webui.iam.accounts.revision")}</span><CodeText value={String(detailAccount.securityRevision)} /></div>
          <div className="detail-field"><span className="detail-field-label">{t("webui.iam.accounts.rolesAssigned")}</span><span className="detail-field-value">{detailRoleError ? t("webui.iam.error") : detailRoleIDs === null ? hostT("webui.host.page.loading.label") : roles.filter((role) => detailRoleIDs.includes(role.id)).map((role) => role.name).join(", ") || "—"}</span></div>
          {detailAccount.mustChangePassword && <div className="detail-field"><span className="detail-field-label">{t("webui.iam.security.changeRequired")}</span><StatusBadge status="pending">{t("webui.iam.security.changeRequired")}</StatusBadge></div>}
          <div className="detail-field"><span className="detail-field-label">{t("webui.iam.accounts.detailSessions")}</span><span className="detail-field-value">{t("webui.iam.accounts.detailSessionsHint")}</span></div>
        </div>
      )}
    </DetailDrawer>
  </PageFrame>;
}
