import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionTrigger, Button, Check, CodeText, ConfirmActionTrigger, DataTable, Drawer, EmptyState, ErrorState, Field, FilterBar, FormField, PageHeader, PageSection, SearchInput, SelectField, StatusBadge } from "@webui/sdk/ui";
import { useListQueryParams } from "@webui/sdk/query";
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

// 082 REQ-082-014: table cell renderers (keep JSX free of inline ternaries).
type Translate = (key: string, params?: Record<string, string | number>) => string;
export function roleKindCell(item: Role, t: Translate) {
  if (item.system) return <StatusBadge status="enabled">{t("webui.iam.roles.system")}</StatusBadge>;
  if (item.archived) return <StatusBadge status="revoked">{t("webui.iam.roles.archived")}</StatusBadge>;
  return <StatusBadge status="active">{t("webui.iam.roles.custom")}</StatusBadge>;
}

export default function RolesPage() {
  const { t } = useWebUITranslation("webui.iam");
  // 082 REQ-082-002/014: list state URL-ized.
  const listQuery = useListQueryParams<{ query: string }>({
    filters: { query: { queryKey: "query", defaultValue: "" } },
  });
  const [items, setItems] = useState<Role[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [loadedKeys, setLoadedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [focusedRoleID, setFocusedRoleID] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const refresh = useCallback((nextPage = page) => {
    setLoading(true);
    setLoadError(false);
    return listRoles(listQuery.filters.query, (nextPage - 1) * PAGE_SIZE, PAGE_SIZE, listQuery.sort ? `${listQuery.sort.key}:${listQuery.sort.direction}` : undefined).then((result) => {
      setTotal(result.total);
      setItems(result.items);
      setSelectedID((current) => current && result.items.some((item) => item.id === current) ? current : result.items[0]?.id || "");
    }).catch(() => { setItems([]); setTotal(0); setLoadError(true); }).finally(() => setLoading(false));
  }, [listQuery.filters.query, listQuery.sort, page]);
  useEffect(() => { void refresh(); void listPermissions().then(setPermissions); }, [refresh]);
  useEffect(() => { void refresh(); }, [listQuery.filters.query]); // 082: query URL change reloads from page 1.
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
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // 082 REQ-082-014: row menu (real operations only).
  const rowActions = (role: Role) => {
    const actions: Array<{ key: string; label: string; onSelect: () => void; danger?: boolean }> = [];
    actions.push({ key: "select", label: t("webui.iam.roles.selected"), onSelect: () => setSelectedID(role.id) });
    if (!role.system && !role.archived) {
      actions.push({ key: "edit", label: t("webui.iam.roles.edit"), onSelect: () => { setFocusedRoleID(role.id); setRoleName(role.name); setRoleDescription(role.description); } });
      actions.push({ key: "archive", label: t("webui.iam.roles.archive"), danger: true, onSelect: () => void archiveRole(role.id).then(() => refresh()).catch(() => setMessage(t("webui.iam.error"))) });
    }
    return actions;
  };
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.roles.title")} description={t("webui.iam.roles.description")} actions={<ActionTrigger operationId="iam.roles.create" onAction={() => setCreateOpen(true)}>{t("webui.iam.roles.create.title")}</ActionTrigger>} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.roles.list.kicker")} title={t("webui.iam.roles.list.title")} footer={<><div className="page-meta">{t("webui.iam.accounts.pagination", { page, total })}</div><div className="toolbar-actions">{[...Array(pages).keys()].map((index) => <Button key={index} variant={index + 1 === page ? "primary" : "secondary"} onClick={() => { setPage(index + 1); void refresh(index + 1); }}>{index + 1}</Button>)}</div></>}>
        <FilterBar
          ariaLabel={t("webui.iam.roles.filter")}
          fields={[]}
          searchInput={<SearchInput value={listQuery.filters.query} onChange={(next) => listQuery.setFilters({ query: next })} placeholder={t("webui.iam.search")} label={t("webui.iam.roles.filter")} />}
          onClear={() => listQuery.clearFilters()}
          clearLabel={t("webui.iam.accounts.clear")}
        />
        <div className="toolbar accounts-sort-bar">
          <SelectField label={t("webui.iam.accounts.sortBy")} value={listQuery.sort?.key ?? ""} options={[
            { value: "", label: t("webui.iam.accounts.sortNone") },
            { value: "name", label: t("webui.iam.roles.name") },
            { value: "code", label: t("webui.iam.roles.code") },
            { value: "createdAt", label: t("webui.iam.sessions.createdAt") },
          ]} onValueChange={(value) => listQuery.setSort(value ? { key: value, direction: listQuery.sort?.direction ?? "asc" } : null)} />
          {listQuery.sort && <SelectField label={t("webui.iam.accounts.sortDirection")} value={listQuery.sort.direction} options={[
            { value: "asc", label: t("webui.iam.accounts.sortAsc") },
            { value: "desc", label: t("webui.iam.accounts.sortDesc") },
          ]} onValueChange={(value) => listQuery.setSort({ key: listQuery.sort?.key ?? "name", direction: value === "desc" ? "desc" : "asc" })} />}
        </div>
        {loadError && <ErrorState kind="connectivity" title={t("webui.host.route.error.title")} detail={t("webui.host.route.error.detail")} />}
        <DataTable<Role>
          columns={[
            { id: "name", header: t("webui.iam.roles.name"), cell: (item) => item.name },
            { id: "code", header: t("webui.iam.roles.code"), cell: (item) => <CodeText value={item.code} /> },
            { id: "kind", header: t("webui.iam.roles.selected"), cell: (item) => roleKindCell(item, t) },
          ]}
          rows={items}
          ariaLabel={t("webui.iam.roles.list.title")}
          loading={loading}
          loadingLabel={t("webui.host.page.loading.label")}
          getRowKey={(item) => item.id}
          emptyState={loadError ? null : <EmptyState title={t("webui.iam.roles.empty")} />}
          enhancements={{
            density: "default",
            stickyHeader: true,
            columnVisibility: { persistedKey: "iam-roles" },
            renderRowMenu: rowActions,
            columnMenuLabel: t("webui.iam.accounts.columns"),
          }}
        />
      </PageSection>
      {selected && (
        <PageSection kicker={t("webui.iam.roles.manage.kicker")} title={`${t("webui.iam.roles.selected")}: ${selected.name} (${selected.code})`}>
          {selected.system
            ? <p className="admin-note">{t("webui.iam.roles.systemReadonly")}</p>
            : <div className="permission-matrix">{groups.map((group) => <fieldset key={group.ownerModuleId}><legend>{group.ownerModuleId}</legend>{group.definitions.map((definition) => <Check key={definition.key} checked={selectedKeys.includes(definition.key)} disabled={selected.archived} onChange={() => toggle(definition.key)} className="permission-row">{definition.key}<span className="permission-description">{t(definition.descriptionMessageId)}</span></Check>)}</fieldset>)}</div>}
          {message && <p className="page-meta">{message}</p>}
          <div className="page-meta">{t("webui.iam.roles.pending")}: +{diff.added} −{diff.removed} · rev {expectedVersion}</div>
          <div className="toolbar-actions">
            <ActionTrigger operationId="iam.roles.permissions.replace" disabled={!selected || selected.system || selected.archived || (diff.added === 0 && diff.removed === 0)} onAction={save}>{t("webui.iam.roles.savePermissions")}</ActionTrigger>
            {selected && !selected.system && !selected.archived && focusedRoleID !== selected.id && <Button variant="secondary" onClick={() => { setFocusedRoleID(selected.id); setRoleName(selected.name); setRoleDescription(selected.description); }}>{t("webui.iam.roles.edit")}</Button>}
            {selected && !selected.system && !selected.archived && <ConfirmActionTrigger
              operationId="iam.roles.archive"
              variant="danger"
              label={t("webui.iam.roles.archive")}
              pendingLabel={t("webui.iam.saving")}
              confirmTitle={t("webui.iam.roles.confirmArchive")}
              confirmDescription={t("webui.iam.roles.archiving")}
              confirmLabel={t("webui.iam.roles.archive")}
              cancelLabel={t("webui.iam.cancel")}
              closeLabel={t("webui.iam.cancel")}
              onConfirm={() => selected ? archiveRole(selected.id).then(() => { setFocusedRoleID(""); return refresh(); }) : Promise.resolve()}
            />}
          </div>
          {focusedRoleID === selected?.id && <><Field label={t("webui.iam.roles.name")} value={roleName} onChange={(event) => setRoleName(event.target.value)} /><Field label={t("webui.iam.roles.description")} value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} /><ActionTrigger operationId="iam.roles.update" disabled={!roleName.trim()} onAction={edit}>{t("webui.iam.roles.edit")}</ActionTrigger></>}
        </PageSection>
      )}
    </div>
    <Drawer open={createOpen} title={t("webui.iam.roles.create.title")} closeLabel={t("webui.iam.cancel")} onClose={() => setCreateOpen(false)}>
      <div className="toolbar drawer-form">
        <FormField label={t("webui.iam.roles.code")} htmlFor="role-code" control={<Field id="role-code" label={t("webui.iam.roles.code")} value={code} onChange={(event) => setCode(event.target.value)} />} />
        <FormField label={t("webui.iam.roles.name")} htmlFor="role-name" control={<Field id="role-name" label={t("webui.iam.roles.name")} value={name} onChange={(event) => setName(event.target.value)} />} />
        <div className="toolbar-actions">
          <ActionTrigger operationId="iam.roles.create" pendingLabel={t("webui.iam.saving")} onAction={() => void createRole(code, name, "").then(() => { setCode(""); setName(""); setCreateOpen(false); return refresh(); }).catch(() => setMessage(t("webui.iam.error")))}>{t("webui.iam.create")}</ActionTrigger>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t("webui.iam.cancel")}</Button>
        </div>
      </div>
    </Drawer>
  </div>;
}
