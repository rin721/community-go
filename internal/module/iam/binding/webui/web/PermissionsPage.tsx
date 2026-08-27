import { useEffect, useMemo, useState } from "react";
import { CodeText, DataTable, PageHeader, PageSection, SearchInput, StatusBadge } from "@webui/sdk/ui";
import { useListQueryParams } from "@webui/sdk/query";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { listPermissions, permissionRoles, type Role } from "./api";
import styles from "./iam.module.css";

type Item = { key: string; ownerModuleId: string; descriptionMessageId: string };

// 082 REQ-082-015: group the permission catalog by owner module (real taxonomy).
export const groupByModule = (items: Item[]): Array<{ ownerModuleId: string; definitions: Item[] }> => {
  const byOwner = new Map<string, Item[]>();
  for (const item of [...items].sort((left, right) => left.key.localeCompare(right.key))) {
    const group = byOwner.get(item.ownerModuleId) ?? [];
    group.push(item);
    byOwner.set(item.ownerModuleId, group);
  }
  return [...byOwner.entries()].map(([ownerModuleId, definitions]) => ({ ownerModuleId, definitions }));
};

export default function PermissionsPage() {
  const { t } = useWebUITranslation("webui.iam");
  // 082 REQ-082-002/015: local search over the in-memory catalog (client-side filter).
  const listQuery = useListQueryParams<{ query: string }>({
    filters: { query: { queryKey: "query", defaultValue: "" } },
  });
  const [items, setItems] = useState<Item[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, Role[]>>({});
  useEffect(() => { void listPermissions().then(setItems); }, []);
  const filtered = useMemo(() => {
    const q = listQuery.filters.query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.key.toLowerCase().includes(q) || item.ownerModuleId.toLowerCase().includes(q));
  }, [items, listQuery.filters.query]);
  const groups = useMemo(() => groupByModule(filtered), [filtered]);
  const toggleUsage = (key: string) => {
    if (expandedKey === key) { setExpandedKey(null); return; }
    setExpandedKey(key);
    if (!usage[key]) void permissionRoles(key).then((result) => setUsage((current) => ({ ...current, [key]: result.items }))).catch(() => setUsage((current) => ({ ...current, [key]: [] })));
  };
  // The catalog is a flat owner-module matrix; a single DataTable per module keeps
  // the Used-by panel close to the permission (master-detail in place).
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.permissions.title")} description={t("webui.iam.permissions.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.permissions.list.kicker")} title={t("webui.iam.permissions.list.title")}>
        <SearchInput value={listQuery.filters.query} onChange={(next) => listQuery.setFilters({ query: next })} placeholder={t("webui.iam.permissions.filter")} label={t("webui.iam.permissions.filter")} />
        {groups.map((group) => (
          <div className="permission-group" key={group.ownerModuleId}>
            <h3 className="permission-group-title">{group.ownerModuleId}</h3>
            <DataTable<Item>
              columns={[
                { id: "key", header: t("webui.iam.permissions.key"), cell: (item) => <CodeText value={item.key} /> },
                { id: "description", header: t("webui.iam.permissions.description"), cell: (item) => t(item.descriptionMessageId) },
                { id: "usedBy", header: t("webui.iam.permissions.usedBy"), cell: (item) => {
                  const roles = usage[item.key];
                  if (!roles) return <button type="button" className="ui-button" onClick={() => toggleUsage(item.key)}>{t("webui.iam.permissions.usedByCheck")}</button>;
                  return roles.length === 0 ? <span className="page-meta">{t("webui.iam.permissions.unused")}</span> : <span className="permission-roles">{roles.map((role) => <StatusBadge key={role.id} status="enabled">{role.name}</StatusBadge>)}</span>;
                } },
              ]}
              rows={group.definitions}
              ariaLabel={`${group.ownerModuleId} permissions`}
              getRowKey={(item) => item.key}
              emptyState={<p className="page-meta">{t("webui.iam.permissions.filterEmpty")}</p>}
            />
          </div>
        ))}
      </PageSection>
    </div>
  </div>;
}