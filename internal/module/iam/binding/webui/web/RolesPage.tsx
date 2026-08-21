import { useEffect, useState } from "react";
import { Button, Field, PageHeader, StatusPill, Surface } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { createRole, listRoles, replaceRolePermissions, rolePermissionKeys, type Role } from "./api";
import styles from "./iam.module.css";

const splitPermissionKeys = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export default function RolesPage() {
  const { t } = useWebUITranslation("webui.iam");
  const [items, setItems] = useState<Role[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [permissionKeys, setPermissionKeys] = useState("");
  const refresh = () => listRoles().then((roles) => { setItems(roles); setSelectedID((current) => current || roles[0]?.id || ""); });
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { if (selectedID) void rolePermissionKeys(selectedID).then((keys) => setPermissionKeys(keys.join(", "))); }, [selectedID]);
  const selected = items.find((item) => item.id === selectedID);
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.roles.title")} description={t("webui.iam.roles.description")} />
    <Surface className="toolbar"><Field label={t("webui.iam.roles.code")} value={code} onChange={(event) => setCode(event.target.value)} /><Field label={t("webui.iam.roles.name")} value={name} onChange={(event) => setName(event.target.value)} /><Button onClick={() => void createRole(code, name, "").then(refresh)}>{t("webui.iam.create")}</Button></Surface>
    <Surface className="management-panel"><label>{t("webui.iam.roles.selected")}<select value={selectedID} onChange={(event) => setSelectedID(event.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label><Field label={t("webui.iam.roles.permissionKeys")} value={permissionKeys} onChange={(event) => setPermissionKeys(event.target.value)} /><Button disabled={!selected || selected.system} onClick={() => selected && void replaceRolePermissions(selected.id, splitPermissionKeys(permissionKeys))}>{t("webui.iam.roles.savePermissions")}</Button></Surface>
    <div className="admin-grid">{items.map((item) => <Surface className="admin-card" key={item.id}><div><h2>{item.name}</h2><p>{item.code}</p></div><StatusPill state={item.active && !item.archived ? "available" : "unavailable"}>{item.system ? t("webui.iam.roles.system") : t("webui.iam.roles.custom")}</StatusPill></Surface>)}</div>
  </div>;
}

export { splitPermissionKeys };
