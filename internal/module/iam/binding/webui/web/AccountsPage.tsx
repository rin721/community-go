import { useCallback, useEffect, useState } from "react";
import { Button, Field, PageHeader, StatusPill, Surface } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { accountRolesView, createAccount, listAccounts, listRoles, replaceAccountRoles, resetAccountPassword, setAccountStatus, type Account, type Role } from "./api";
import styles from "./iam.module.css";

// checklistCandidates only exposes active, non-archived roles for assignment.
export const checklistCandidates = (roles: Role[]) => roles.filter((role) => role.active && !role.archived);

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
  const refresh = () => listAccounts().then((accounts) => { setItems(accounts); setSelectedID((current) => current || accounts[0]?.id || ""); });
  useEffect(() => { void refresh(); void listRoles().then(setRoles); }, []);
  const reloadSelection = useCallback((id: string) => {
    if (!id) return;
    void accountRolesView(id).then((view) => {
      setRoleIDs(view.roleIds);
      setExpectedVersion(view.accountVersion);
      setMessage("");
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
    }).catch(() => { setMessage(t("webui.iam.error")); return reloadSelection(selected.id); });
  };
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.accounts.title")} description={t("webui.iam.accounts.description")} />
    <Surface className="toolbar"><Field label={t("webui.iam.username")} value={username} onChange={(event) => setUsername(event.target.value)} /><Field label={t("webui.iam.displayName")} value={name} onChange={(event) => setName(event.target.value)} /><Field label={t("webui.iam.password")} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /><Button onClick={() => void createAccount(username, name, password).then(refresh)}>{t("webui.iam.create")}</Button></Surface>
    <Surface className="management-panel">
      <label>{t("webui.iam.accounts.selected")}<select value={selectedID} onChange={(event) => setSelectedID(event.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.displayName} (@{item.username})</option>)}</select></label>
      <div className="role-checklist">{candidates.map((role) => <label key={role.id} className="permission-row"><input type="checkbox" checked={roleIDs.includes(role.id)} onChange={() => toggle(role.id)} />{role.name} ({role.code})</label>)}</div>
      {message && <p className="admin-meta">{message}</p>}
      <div className="admin-meta">{t("webui.iam.accounts.revision")} rev {expectedVersion}</div>
      <Button disabled={!selected} onClick={save}>{t("webui.iam.accounts.saveRoles")}</Button>
      <Button disabled={!selected} onClick={() => selected && void setAccountStatus(selected.id, selected.status === "active" ? "disabled" : "active").then(refresh)}>{selected?.status === "active" ? t("webui.iam.accounts.disable") : t("webui.iam.accounts.enable")}</Button>
      <Field label={t("webui.iam.accounts.resetPassword")} type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
      <Button disabled={!selected || resetPassword.length < 15} onClick={() => selected && void resetAccountPassword(selected.id, resetPassword).then(() => setResetPassword(""))}>{t("webui.iam.accounts.reset")}</Button>
    </Surface>
    <div className="admin-grid">{items.map((item) => <Surface className="admin-card" key={item.id}><div><h2>{item.displayName}</h2><p>@{item.username} · rev {item.securityRevision}</p></div><div className="admin-meta"><StatusPill state={item.status === "active" ? "available" : "unavailable"}>{item.status}</StatusPill>{item.mustChangePassword && <StatusPill state="degraded">{t("webui.iam.security.changeRequired")}</StatusPill>}</div></Surface>)}</div>
  </div>;
}