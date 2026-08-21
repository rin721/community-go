import { useEffect, useState } from "react";
import { Button, Field, PageHeader, StatusPill, Surface } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { accountRoleIDs, createAccount, listAccounts, replaceAccountRoles, resetAccountPassword, setAccountStatus, type Account } from "./api";
import styles from "./iam.module.css";

const splitIDs = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export default function AccountsPage() {
  const { t } = useWebUITranslation("webui.iam");
  const [items, setItems] = useState<Account[]>([]);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [roleIDs, setRoleIDs] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const refresh = () => listAccounts().then((accounts) => { setItems(accounts); setSelectedID((current) => current || accounts[0]?.id || ""); });
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { if (selectedID) void accountRoleIDs(selectedID).then((ids) => setRoleIDs(ids.join(", "))); }, [selectedID]);
  const selected = items.find((item) => item.id === selectedID);
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.accounts.title")} description={t("webui.iam.accounts.description")} />
    <Surface className="toolbar"><Field label={t("webui.iam.username")} value={username} onChange={(event) => setUsername(event.target.value)} /><Field label={t("webui.iam.displayName")} value={name} onChange={(event) => setName(event.target.value)} /><Field label={t("webui.iam.password")} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /><Button onClick={() => void createAccount(username, name, password).then(refresh)}>{t("webui.iam.create")}</Button></Surface>
    <Surface className="management-panel">
      <label>{t("webui.iam.accounts.selected")}<select value={selectedID} onChange={(event) => setSelectedID(event.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.displayName} (@{item.username})</option>)}</select></label>
      <Field label={t("webui.iam.accounts.roleIDs")} value={roleIDs} onChange={(event) => setRoleIDs(event.target.value)} />
      <Button disabled={!selected} onClick={() => selected && void replaceAccountRoles(selected.id, splitIDs(roleIDs)).then(refresh)}>{t("webui.iam.accounts.saveRoles")}</Button>
      <Button disabled={!selected} onClick={() => selected && void setAccountStatus(selected.id, selected.status === "active" ? "disabled" : "active").then(refresh)}>{selected?.status === "active" ? t("webui.iam.accounts.disable") : t("webui.iam.accounts.enable")}</Button>
      <Field label={t("webui.iam.accounts.resetPassword")} type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
      <Button disabled={!selected || resetPassword.length < 15} onClick={() => selected && void resetAccountPassword(selected.id, resetPassword).then(() => setResetPassword(""))}>{t("webui.iam.accounts.reset")}</Button>
    </Surface>
    <div className="admin-grid">{items.map((item) => <Surface className="admin-card" key={item.id}><div><h2>{item.displayName}</h2><p>@{item.username} · rev {item.securityRevision}</p></div><div className="admin-meta"><StatusPill state={item.status === "active" ? "available" : "unavailable"}>{item.status}</StatusPill>{item.mustChangePassword && <StatusPill state="degraded">{t("webui.iam.security.changeRequired")}</StatusPill>}</div></Surface>)}</div>
  </div>;
}

export { splitIDs };
