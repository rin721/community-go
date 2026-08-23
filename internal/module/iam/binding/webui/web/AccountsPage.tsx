import { useCallback, useEffect, useState } from "react";
import { ActionTrigger, Button, Field, PageHeader, PageSection, RevealList, SelectField, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { accountRolesView, archiveAccount, createAccount, listAccounts, listRoles, replaceAccountRoles, resetAccountPassword, setAccountStatus, updateAccountInfo, type Account, type Role } from "./api";
import styles from "./iam.module.css";

// checklistCandidates only exposes active, non-archived roles for assignment.
export const checklistCandidates = (roles: Role[]) => roles.filter((role) => role.active && !role.archived);

const PAGE_SIZE = 10;

export default function AccountsPage() {
  const { t } = useWebUITranslation("webui.iam");
  const [items, setItems] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [roleIDs, setRoleIDs] = useState<string[]>([]);
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [renameValue, setRenameValue] = useState("");
  const [archiveError, setArchiveError] = useState(false);
  const refresh = useCallback((nextPage = page, nextQuery = query) => {
    return listAccounts(nextQuery, (nextPage - 1) * PAGE_SIZE, PAGE_SIZE).then((result) => {
      setTotal(result.total);
      setItems(result.items);
      setSelectedID((current) => current && result.items.some((item) => item.id === current) ? current : result.items[0]?.id || "");
    });
  }, [page, query]);
  useEffect(() => { void refresh(); void listRoles().then((result) => setRoles(result.items)); }, [refresh]);
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
      // Server-side version changed (409): reload the latest roles and ask the
      // user to re-confirm; never silently discard unsaved selections.
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
  const applyQuery = () => { setPage(1); void refresh(1, query); };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.accounts.title")} description={t("webui.iam.accounts.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.accounts.create.kicker")} title={t("webui.iam.accounts.create.title")}>
        <div className="toolbar"><Field label={t("webui.iam.username")} value={username} onChange={(event) => setUsername(event.target.value)} /><Field label={t("webui.iam.displayName")} value={name} onChange={(event) => setName(event.target.value)} /><Field label={t("webui.iam.password")} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /><ActionTrigger operationId="iam.accounts.create" onAction={() => void createAccount(username, name, password).then(() => { setUsername(""); setName(""); setPassword(""); return refresh(); }).catch(() => setMessage(t("webui.iam.error")))}>{t("webui.iam.create")}</ActionTrigger></div>
      </PageSection>
      <PageSection kicker={t("webui.iam.accounts.manage.kicker")} title={t("webui.iam.accounts.manage.title")}>
        <SelectField label={t("webui.iam.accounts.selected")} value={selectedID} onValueChange={setSelectedID} options={items.map((item) => ({ value: item.id, label: `${item.displayName} (@${item.username})${item.archived ? ` · ${t("webui.iam.accounts.archived")}` : ""}` }))} />
        <div className="role-checklist">{candidates.map((role) => <label key={role.id} className="permission-row"><input type="checkbox" checked={roleIDs.includes(role.id)} disabled={!selected || selected.archived} onChange={() => toggle(role.id)} />{role.name} ({role.code})</label>)}</div>
        {message && <p className="page-meta">{message}</p>}
        <div className="page-meta">{t("webui.iam.accounts.revision")} rev {expectedVersion}</div>
        <div className="toolbar-actions">
          <ActionTrigger operationId="iam.accounts.roles.replace" disabled={!selected || selected.archived} onAction={save}>{t("webui.iam.accounts.saveRoles")}</ActionTrigger>
          <ActionTrigger operationId="iam.accounts.status" variant="secondary" disabled={!selected || selected.archived} onAction={() => selected ? setAccountStatus(selected.id, selected.status === "active" ? "disabled" : "active").then(() => refresh()) : undefined}>{selected?.status === "active" ? t("webui.iam.accounts.disable") : t("webui.iam.accounts.enable")}</ActionTrigger>
        </div>
        <Field label={t("webui.iam.accounts.resetPassword")} type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
        <ActionTrigger operationId="iam.accounts.password.reset" disabled={!selected || selected.archived || resetPassword.length < 15} onAction={() => selected ? resetAccountPassword(selected.id, resetPassword).then(() => setResetPassword("")) : undefined}>{t("webui.iam.accounts.reset")}</ActionTrigger>
        <Field label={t("webui.iam.displayName")} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
        <ActionTrigger operationId="iam.accounts.update" disabled={!selected || selected.archived || !renameValue.trim()} onAction={rename}>{t("webui.iam.accounts.editName")}</ActionTrigger>
        <ActionTrigger operationId="iam.accounts.archive" variant="danger" disabled={!selected || selected.archived} onAction={archive}>{t("webui.iam.accounts.archive")}</ActionTrigger>
        {archiveError && <p className="page-meta">{t("webui.iam.error")}</p>}
      </PageSection>
      <PageSection kicker={t("webui.iam.accounts.list.kicker")} title={t("webui.iam.accounts.list.title")} footer={<><div className="page-meta">{t("webui.iam.accounts.pagination", { page, total })}</div><div className="toolbar-actions">{[...Array(pages).keys()].map((index) => <Button key={index} variant={index + 1 === page ? "primary" : "secondary"} onClick={() => { setPage(index + 1); void refresh(index + 1); }}>{index + 1}</Button>)}</div></>}>
        <div className="toolbar"><Field label={t("webui.iam.accounts.filter")} value={query} onChange={(event) => setQuery(event.target.value)} /><Button onClick={applyQuery}>{t("webui.iam.search")}</Button></div>
        <RevealList className="card-grid">
          {items.map((item) => <div className="item-card" key={item.id}><div><h3>{item.displayName}</h3><p>@{item.username} · rev {item.securityRevision}</p></div><div className="item-card-meta"><StatusPill state={item.status === "active" && !item.archived ? "available" : "unavailable"}>{item.archived ? t("webui.iam.accounts.archived") : item.status}</StatusPill>{item.mustChangePassword && <StatusPill state="degraded">{t("webui.iam.security.changeRequired")}</StatusPill>}</div></div>)}
        </RevealList>
      </PageSection>
    </div>
  </div>;
}