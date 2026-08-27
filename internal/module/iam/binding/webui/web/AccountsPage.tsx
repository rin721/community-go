import { useCallback, useEffect, useState } from "react";
import { ActionTrigger, Button, Check, CodeText, DataTable, DetailDrawer, Drawer, Field, FilterBar, FormField, PageHeader, PageSection, SearchInput, StatusBadge } from "@webui/sdk/ui";
import { useListQueryParams } from "@webui/sdk/query";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { accountRolesView, archiveAccount, createAccount, listAccounts, listRoles, replaceAccountRoles, resetAccountPassword, setAccountStatus, updateAccountInfo, type Account, type Role } from "./api";
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

const PAGE_SIZE = 10;

export default function AccountsPage() {
  const { t } = useWebUITranslation("webui.iam");
  // 082 REQ-082-012/002: list state URL-ized (query refresh keeps context).
  const listQuery = useListQueryParams<{ query: string; status: string; archived: boolean }>({
    filters: {
      query: { queryKey: "query", defaultValue: "" },
      status: { queryKey: "status", defaultValue: "", decode: (raw) => raw ?? "" },
      archived: { queryKey: "archived", defaultValue: false, decode: (raw) => raw === "true" },
    },
  });
  const [items, setItems] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [roleIDs, setRoleIDs] = useState<string[]>([]);
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [renameValue, setRenameValue] = useState("");
  const [archiveError, setArchiveError] = useState(false);
  const [detailAccount, setDetailAccount] = useState<Account | null>(null);
  const refresh = useCallback((nextPage = page) => {
    const status = listQuery.filters.status === "active" || listQuery.filters.status === "disabled" ? listQuery.filters.status : undefined;
    return listAccounts(listQuery.filters.query, (nextPage - 1) * PAGE_SIZE, PAGE_SIZE, { status, archived: listQuery.filters.archived }).then((result) => {
      setTotal(result.total);
      setItems(result.items);
      setSelectedID((current) => current && result.items.some((item) => item.id === current) ? current : result.items[0]?.id || "");
    });
  }, [listQuery.filters.query, listQuery.filters.status, listQuery.filters.archived, page]);
  useEffect(() => { void refresh(); void listRoles().then((result) => setRoles(result.items)); }, [refresh]);
  useEffect(() => { void refresh(); }, [listQuery.filters.query, listQuery.filters.status, listQuery.filters.archived]); // 083: filter URL change reloads from page 1.
  const reloadSelection = useCallback((id: string) => {
    if (!id) return;
    void accountRolesView(id).then((view) => {
      setRoleIDs(view.roleIds);
      setExpectedVersion(view.accountVersion);
      setRenameValue("");
      setMessage("");
      setArchiveError(false);
    });
  }, []);
  useEffect(() => { if (selectedID) reloadSelection(selectedID); }, [selectedID, reloadSelection]);
  const selected = items.find((item) => item.id === selectedID);
  const candidates = checklistCandidates(roles);
  const toggle = (id: string) => setRoleIDs((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const save = () => {
    if (!selected) return;
    void replaceAccountRoles(selected.id, expectedVersion, roleIDs).then((result) => {
      setMessage(`${t("webui.iam.accounts.saved")} +${result.added} −${result.removed}`);
      return reloadSelection(selected.id);
    }).catch(() => {
      void accountRolesView(selected.id).then((view) => {
        const added = view.roleIds.filter((id) => !roleIDs.includes(id)).length;
        const removed = roleIDs.filter((id) => !view.roleIds.includes(id)).length;
        setMessage(t("webui.iam.accounts.conflictResolve", { added, removed }));
        setRoleIDs(view.roleIds);
        setExpectedVersion(view.accountVersion);
      });
    });
  };
  const rename = () => {
    if (!selected || !renameValue.trim()) return;
    void updateAccountInfo(selected.id, selected.version, renameValue.trim()).then(() => {
      setMessage(t("webui.iam.accounts.nameUpdated"));
      return refresh();
    }).catch(() => { void refresh(); });
  };
  const archive = () => {
    if (!selected) return;
    void archiveAccount(selected.id).then(() => refresh()).catch(() => setArchiveError(true));
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // 082 REQ-082-012: DataTable row menu (real operations only, disabled by state).
  const rowActions = (account: Account) => {
    const actions: Array<{ key: string; label: string; onSelect: () => void; danger?: boolean }> = [];
    actions.push({ key: "detail", label: t("webui.iam.accounts.detail"), onSelect: () => { setSelectedID(account.id); setDetailAccount(account); } });
    actions.push({ key: "select", label: t("webui.iam.accounts.select"), onSelect: () => setSelectedID(account.id) });
    if (!account.archived) {
      actions.push({ key: "status", label: account.status === "active" ? t("webui.iam.accounts.disable") : t("webui.iam.accounts.enable"), onSelect: () => void setAccountStatus(account.id, account.status === "active" ? "disabled" : "active").then(() => refresh()) });
      actions.push({ key: "archive", label: t("webui.iam.accounts.archive"), danger: true, onSelect: () => void archiveAccount(account.id).then(() => refresh()).catch(() => setArchiveError(true)) });
    }
    return actions;
  };
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.accounts.title")} description={t("webui.iam.accounts.description")} actions={<ActionTrigger operationId="iam.accounts.create" onAction={() => setCreateOpen(true)}>{t("webui.iam.accounts.create.title")}</ActionTrigger>} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.accounts.list.kicker")} title={t("webui.iam.accounts.list.title")} footer={<><div className="page-meta">{t("webui.iam.accounts.pagination", { page, total })}</div><div className="toolbar-actions">{[...Array(pages).keys()].map((index) => <Button key={index} variant={index + 1 === page ? "primary" : "secondary"} onClick={() => { setPage(index + 1); void refresh(index + 1); }}>{index + 1}</Button>)}</div></>}>
        <FilterBar
          ariaLabel={t("webui.iam.accounts.filter")}
          fields={[
            { key: "status", label: t("webui.iam.accounts.statusFilter"), control: "select", options: [
              { value: "", label: t("webui.iam.accounts.statusAll") },
              { value: "active", label: t("webui.iam.accounts.statusActive") },
              { value: "disabled", label: t("webui.iam.accounts.statusDisabled") },
            ], value: listQuery.filters.status, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, status: String(next) }) },
            { key: "archived", label: t("webui.iam.accounts.archivedFilter"), control: "switch", value: listQuery.filters.archived, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, archived: Boolean(next) }) },
          ]}
          searchInput={<SearchInput value={listQuery.filters.query} onChange={(next) => listQuery.setFilters({ ...listQuery.filters, query: next })} placeholder={t("webui.iam.search")} label={t("webui.iam.accounts.filter")} />}
          onClear={() => listQuery.clearFilters()}
          clearLabel={t("webui.iam.accounts.clear")}
        />
        <DataTable<Account>
          columns={[
            { id: "displayName", header: t("webui.iam.displayName"), cell: (item) => item.displayName },
            { id: "username", header: t("webui.iam.username"), cell: (item) => <CodeText value={item.username} /> },
            { id: "status", header: t("webui.iam.accounts.tableStatus"), cell: (item) => accountStatusCell(item, t) },
            { id: "security", header: t("webui.iam.accounts.tableRevision"), cell: (item) => accountSecurityCell(item, t) },
          ]}
          rows={items}
          ariaLabel={t("webui.iam.accounts.list.title")}
          getRowKey={(item) => item.id}
          emptyState={<p className="page-meta">{t("webui.iam.accounts.empty")}</p>}
          enhancements={{
            density: "default",
            stickyHeader: true,
            columnVisibility: { persistedKey: "iam-accounts" },
            renderRowMenu: rowActions,
            columnMenuLabel: t("webui.iam.accounts.columns"),
          }}
        />
      </PageSection>
      {selected && (
        <PageSection kicker={t("webui.iam.accounts.manage.kicker")} title={`${t("webui.iam.accounts.selected")}: ${selected.displayName}`}>
          <div className="page-meta">{t("webui.iam.accounts.revision")} rev {expectedVersion}</div>
          <div className="role-checklist">{candidates.map((role) => <Check key={role.id} checked={roleIDs.includes(role.id)} disabled={selected.archived} onChange={() => toggle(role.id)} className="permission-row">{role.name} ({role.code})</Check>)}</div>
          {message && <p className="page-meta">{message}</p>}
          <div className="toolbar-actions">
            <ActionTrigger operationId="iam.accounts.roles.replace" disabled={selected.archived} onAction={save}>{t("webui.iam.accounts.saveRoles")}</ActionTrigger>
            <ActionTrigger operationId="iam.accounts.status" variant="secondary" disabled={selected.archived} onAction={() => selected ? setAccountStatus(selected.id, selected.status === "active" ? "disabled" : "active").then(() => refresh()) : undefined}>{selected.status === "active" ? t("webui.iam.accounts.disable") : t("webui.iam.accounts.enable")}</ActionTrigger>
          </div>
          <div className="toolbar">
            <Field label={t("webui.iam.accounts.resetPassword")} type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
            <ActionTrigger operationId="iam.accounts.password.reset" disabled={selected.archived || resetPassword.length < 15} onAction={() => selected ? resetAccountPassword(selected.id, resetPassword).then(() => setResetPassword("")) : undefined}>{t("webui.iam.accounts.reset")}</ActionTrigger>
            <Field label={t("webui.iam.displayName")} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
            <ActionTrigger operationId="iam.accounts.update" disabled={selected.archived || !renameValue.trim()} onAction={rename}>{t("webui.iam.accounts.editName")}</ActionTrigger>
            <ActionTrigger operationId="iam.accounts.archive" variant="danger" disabled={selected.archived} onAction={archive}>{t("webui.iam.accounts.archive")}</ActionTrigger>
            {archiveError && <p className="page-meta">{t("webui.iam.error")}</p>}
          </div>
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
          <div className="detail-field"><span className="detail-field-label">{t("webui.iam.accounts.rolesAssigned")}</span><span className="detail-field-value">{roles.filter((role) => roleIDs.includes(role.id)).map((role) => role.name).join(", ") || "—"}</span></div>
          {detailAccount.mustChangePassword && <div className="detail-field"><span className="detail-field-label">{t("webui.iam.security.changeRequired")}</span><StatusBadge status="pending">{t("webui.iam.security.changeRequired")}</StatusBadge></div>}
          <div className="detail-field"><span className="detail-field-label">{t("webui.iam.accounts.detailSessions")}</span><span className="detail-field-value">{t("webui.iam.accounts.detailSessionsHint")}</span></div>
        </div>
      )}
    </DetailDrawer>
  </div>;
}