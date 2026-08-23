import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionTrigger, Button, Field, PageHeader, PageSection, RevealList, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { archiveRole, createRole, listPermissions, listRoles, replaceRolePermissions, rolePermissionsView, updateRoleInfo, type PermissionDefinition, type Role } from "./api";
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

const PAGE_SIZE = 10;

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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [focusedRoleID, setFocusedRoleID] = useState("");
  const refresh = useCallback((nextPage = page, nextQuery = query) => {
    return listRoles(nextQuery, (nextPage - 1) * PAGE_SIZE, PAGE_SIZE).then((result) => {
      setTotal(result.total);
      setItems(result.items);
      setSelectedID((current) => current && result.items.some((item) => item.id === current) ? current : result.items[0]?.id || "");
    });
  }, [page, query]);
  useEffect(() => { void refresh(); void listPermissions().then(setPermissions); }, [refresh]);
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
      return reloadSelection(selected.id);
    }).catch(() => {
      // Server-side permissions changed (409): reload the latest set and surface
      // the diff; never silently discard unsaved selections.
      void rolePermissionsView(selected.id).then((view) => {
        const added = view.permissionKeys.filter((key) => !selectedKeys.includes(key)).length;
        const removed = selectedKeys.filter((key) => !view.permissionKeys.includes(key)).length;
        setMessage(t("webui.iam.roles.conflictResolve", { added, removed }));
        setLoadedKeys(view.permissionKeys);
        setSelectedKeys(view.permissionKeys);
        setExpectedVersion(view.roleVersion);
      });
    });
  };
  const edit = () => {
    if (!selected || selected.system || !roleName.trim()) return;
    void updateRoleInfo(selected.id, selected.version, roleName.trim(), roleDescription).then((item) => {
      setMessage(t("webui.iam.roles.updated"));
      setFocusedRoleID("");
      setRoleName("");
      setRoleDescription("");
      const index = items.findIndex((value) => value.id === item.id);
      if (index >= 0) setItems((current) => [...current.slice(0, index), item, ...current.slice(index + 1)]);
    }).catch(() => { void refresh(); });
  };
  const archive = () => {
    if (!selected || selected.system) return;
    void archiveRole(selected.id).then(() => { setFocusedRoleID(""); return refresh(); }).catch(() => setMessage(t("webui.iam.error")));
  };
  const applyQuery = () => { setPage(1); void refresh(1, query); };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.roles.title")} description={t("webui.iam.roles.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.roles.create.kicker")} title={t("webui.iam.roles.create.title")}>
        <div className="toolbar"><Field label={t("webui.iam.roles.code")} value={code} onChange={(event) => setCode(event.target.value)} /><Field label={t("webui.iam.roles.name")} value={name} onChange={(event) => setName(event.target.value)} /><ActionTrigger operationId="iam.roles.create" onAction={() => void createRole(code, name, "").then(() => { setCode(""); setName(""); return refresh(); }).catch(() => setMessage(t("webui.iam.error")))}>{t("webui.iam.create")}</ActionTrigger></div>
      </PageSection>
      <PageSection kicker={t("webui.iam.roles.manage.kicker")} title={t("webui.iam.roles.manage.title")}>
        <label className="form-field">{t("webui.iam.roles.selected")}<select className="field-input" value={selectedID} onChange={(event) => setSelectedID(event.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code}){item.archived ? ` · ${t("webui.iam.roles.archived")}` : ""}</option>)}</select></label>
        {selected?.system
          ? <p className="admin-note">{t("webui.iam.roles.systemReadonly")}</p>
          : <div className="permission-matrix">{groups.map((group) => <fieldset key={group.ownerModuleId}><legend>{group.ownerModuleId}</legend>{group.definitions.map((definition) => <label key={definition.key} className="permission-row"><input type="checkbox" checked={selectedKeys.includes(definition.key)} disabled={!selected || selected.archived} onChange={() => toggle(definition.key)} />{definition.key}<span className="permission-description">{t(definition.descriptionMessageId)}</span></label>)}</fieldset>)}</div>}
        {message && <p className="page-meta">{message}</p>}
        <div className="page-meta">{t("webui.iam.roles.pending")}: +{diff.added} −{diff.removed} · rev {expectedVersion}</div>
        <div className="toolbar-actions">
          <ActionTrigger operationId="iam.roles.permissions.replace" disabled={!selected || selected.system || selected.archived || (diff.added === 0 && diff.removed === 0)} onAction={save}>{t("webui.iam.roles.savePermissions")}</ActionTrigger>
          {selected && !selected.system && !selected.archived && focusedRoleID !== selected.id && <Button variant="secondary" onClick={() => { setFocusedRoleID(selected.id); setRoleName(selected.name); setRoleDescription(selected.description); }}>{t("webui.iam.roles.edit")}</Button>}
          {selected && !selected.system && !selected.archived && <ActionTrigger operationId="iam.roles.archive" variant="danger" onAction={archive}>{t("webui.iam.roles.archive")}</ActionTrigger>}
        </div>
        {focusedRoleID === selected?.id && <><Field label={t("webui.iam.roles.name")} value={roleName} onChange={(event) => setRoleName(event.target.value)} /><Field label={t("webui.iam.roles.description")} value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} /><ActionTrigger operationId="iam.roles.update" disabled={!roleName.trim()} onAction={edit}>{t("webui.iam.roles.savePermissions")}</ActionTrigger></>}
      </PageSection>
      <PageSection kicker={t("webui.iam.roles.list.kicker")} title={t("webui.iam.roles.list.title")} footer={<><div className="page-meta">{t("webui.iam.accounts.pagination", { page, total })}</div><div className="toolbar-actions">{[...Array(pages).keys()].map((index) => <Button key={index} variant={index + 1 === page ? "primary" : "secondary"} onClick={() => { setPage(index + 1); void refresh(index + 1); }}>{index + 1}</Button>)}</div></>}>
        <div className="toolbar"><Field label={t("webui.iam.roles.filter")} value={query} onChange={(event) => setQuery(event.target.value)} /><Button onClick={applyQuery}>{t("webui.iam.search")}</Button></div>
        <RevealList className="card-grid">
          {items.map((item) => <div className="item-card" key={item.id}><div><h3>{item.name}</h3><p>{item.code}</p></div><StatusPill state={item.active && !item.archived ? "available" : "unavailable"}>{item.system ? t("webui.iam.roles.system") : item.archived ? t("webui.iam.roles.archived") : t("webui.iam.roles.custom")}</StatusPill></div>)}
        </RevealList>
      </PageSection>
    </div>
  </div>;
}