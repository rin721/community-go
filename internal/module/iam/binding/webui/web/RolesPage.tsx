import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Field, PageHeader, StatusPill, Surface } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { createRole, listPermissions, listRoles, replaceRolePermissions, rolePermissionsView, type PermissionDefinition, type Role } from "./api";
import styles from "./iam.module.css";

type GroupedPermissions = Array<{ ownerModuleId: string; definitions: PermissionDefinition[] }>;

// groupByOwnerModule groups the catalog by owner module in stable order; the
// matrix must not accept free-form keys.
export const groupByOwnerModule = (definitions: PermissionDefinition[]): GroupedPermissions => {
  const byOwner = new Map<string, PermissionDefinition[]>();
  for (const definition of [...definitions].sort((left, right) => left.key.localeCompare(right.key))) {
    const group = byOwner.get(definition.ownerModuleId) ?? [];
    group.push(definition);
    byOwner.set(definition.ownerModuleId, group);
  }
  return [...byOwner.entries()].map(([ownerModuleId, items]) => ({ ownerModuleId, definitions: items }));
};

// diffKeys computes added/removed counts relative to the loaded selection for
// pre-save confirmation.
export const diffKeys = (current: string[], selected: string[]): { added: number; removed: number } => {
  const currentSet = new Set(current);
  const selectedSet = new Set(selected);
  let added = 0;
  let removed = 0;
  for (const key of selected) if (!currentSet.has(key)) added += 1;
  for (const key of current) if (!selectedSet.has(key)) removed += 1;
  return { added, removed };
};

export default function RolesPage() {
  const { t } = useWebUITranslation("webui.iam");
  const [items, setItems] = useState<Role[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [loadedKeys, setLoadedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [message, setMessage] = useState("");
  const refresh = () => listRoles().then((roles) => { setItems(roles); setSelectedID((current) => current || roles[0]?.id || ""); });
  useEffect(() => { void refresh(); void listPermissions().then(setPermissions); }, []);
  const reloadSelection = useCallback((id: string) => {
    if (!id) return;
    void rolePermissionsView(id).then((view) => {
      setLoadedKeys(view.permissionKeys);
      setSelectedKeys(view.permissionKeys);
      setExpectedVersion(view.roleVersion);
      setMessage("");
    });
  }, []);
  useEffect(() => { if (selectedID) reloadSelection(selectedID); }, [selectedID, reloadSelection]);
  const selected = items.find((item) => item.id === selectedID);
  const groups = useMemo(() => groupByOwnerModule(permissions), [permissions]);
  const toggle = (key: string) => setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const diff = diffKeys(loadedKeys, selectedKeys);
  const save = () => {
    if (!selected || selected.system) return;
    void replaceRolePermissions(selected.id, expectedVersion, selectedKeys).then((result) => {
      setMessage(`${t("webui.iam.roles.saved")} +${result.added} −${result.removed}`);
      setSelectedKeys([]);
      return reloadSelection(selected.id);
    }).catch(() => { setMessage(t("webui.iam.error")); return reloadSelection(selected.id); });
  };
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.roles.title")} description={t("webui.iam.roles.description")} />
    <Surface className="toolbar"><Field label={t("webui.iam.roles.code")} value={code} onChange={(event) => setCode(event.target.value)} /><Field label={t("webui.iam.roles.name")} value={name} onChange={(event) => setName(event.target.value)} /><Button onClick={() => void createRole(code, name, "").then(refresh)}>{t("webui.iam.create")}</Button></Surface>
    <Surface className="management-panel">
      <label>{t("webui.iam.roles.selected")}<select className="field-input" value={selectedID} onChange={(event) => setSelectedID(event.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>
      {selected?.system
        ? <p className="admin-note">{t("webui.iam.roles.systemReadonly")}</p>
        : <div className="permission-matrix">{groups.map((group) => <fieldset key={group.ownerModuleId}><legend>{group.ownerModuleId}</legend>{group.definitions.map((definition) => <label key={definition.key} className="permission-row"><input type="checkbox" checked={selectedKeys.includes(definition.key)} onChange={() => toggle(definition.key)} />{definition.key}<span className="permission-description">{t(definition.descriptionMessageId)}</span></label>)}</fieldset>)}</div>}
      {message && <p className="admin-meta">{message}</p>}
      <div className="admin-meta">{t("webui.iam.roles.pending")}: +{diff.added} −{diff.removed} · rev {expectedVersion}</div>
      <Button disabled={!selected || selected.system || (diff.added === 0 && diff.removed === 0)} onClick={save}>{t("webui.iam.roles.savePermissions")}</Button>
    </Surface>
    <div className="admin-grid">{items.map((item) => <Surface className="admin-card" key={item.id}><div><h2>{item.name}</h2><p>{item.code}</p></div><StatusPill state={item.active && !item.archived ? "available" : "unavailable"}>{item.system ? t("webui.iam.roles.system") : t("webui.iam.roles.custom")}</StatusPill></Surface>)}</div>
  </div>;
}