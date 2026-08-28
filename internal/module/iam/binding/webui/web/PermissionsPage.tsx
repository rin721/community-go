import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, CodeText, DataTable, EmptyState, ErrorState, FilterBar, PageFrame, PageHeader, PageSection, ResourceIndex, Skeleton, StatusBadge } from "@webui/sdk/ui";
import { useListQueryParams } from "@webui/sdk/query";
import type { ProblemError } from "@webui/sdk/query";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { listPermissions, permissionRoles, type Role } from "./api";
import { permissionDescription, preloadPermissionDescriptions } from "./permission-label";
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
  const { t: hostT } = useWebUITranslation("webui.host");
  // 082 REQ-082-002/015: local search over the in-memory catalog (client-side filter).
  const listQuery = useListQueryParams<{ query: string }>({
    filters: { query: { queryKey: "query", defaultValue: "" } },
  });
  const [items, setItems] = useState<Item[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, Role[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<ProblemError | null>(null);
  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    return listPermissions().then(async (result) => { setItems(result); await preloadPermissionDescriptions(result); }).catch((error) => { setItems([]); setLoadError(error as ProblemError); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
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
  return <PageFrame variant="index" className={styles.iamModule}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.permissions.title")} description={t("webui.iam.permissions.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.permissions.list.kicker")} title={t("webui.iam.permissions.list.title")}>
        <ResourceIndex toolbar={<FilterBar
          ariaLabel={t("webui.iam.permissions.filter")}
          fields={[{ key: "query", label: t("webui.iam.permissions.filter"), placeholder: t("webui.iam.permissions.filter"), control: "input", value: listQuery.filters.query, onValueChange: (next) => listQuery.setFilters({ query: String(next) }) }]}
          onClear={() => listQuery.clearFilters()}
          clearLabel={t("webui.iam.accounts.clear")}
          resultCount={filtered.length}
          resultCountLabel={(count) => t("webui.iam.permissions.total", { count })}
        />}>
          {loadError && <ErrorState kind="connectivity" title={hostT("webui.host.route.error.title")} detail={hostT("webui.host.route.error.detail")} requestId={loadError.requestId} action={<Button variant="secondary" onClick={() => void refresh()}>{hostT("webui.host.retry")}</Button>} />}
          {loading && !loadError && <Skeleton lines={5} label={hostT("webui.host.page.loading.label")} />}
          {!loading && !loadError && groups.length === 0 && <EmptyState title={t("webui.iam.permissions.filterEmpty")} />}
          {!loading && !loadError && groups.map((group) => (
          <div className="permission-group" key={group.ownerModuleId}>
            <h3 className="permission-group-title">{group.ownerModuleId}<span className="page-meta">{String(group.definitions.length)}</span></h3>
            <DataTable<Item>
              columns={[
                { id: "key", header: t("webui.iam.permissions.key"), className: "permission-key-col", cell: (item) => <CodeText value={item.key} /> },
                { id: "description", header: t("webui.iam.permissions.colDescription"), cell: (item) => permissionDescription(item.descriptionMessageId) },
                { id: "usedBy", header: t("webui.iam.permissions.usedBy"), cell: (item) => {
                  const roles = usage[item.key];
                  if (!roles) return <button type="button" className="ui-button" onClick={() => toggleUsage(item.key)}>{t("webui.iam.permissions.usedByCheck")}</button>;
                  return roles.length === 0 ? <EmptyState title={t("webui.iam.permissions.unused")} /> : <span className="permission-roles">{roles.map((role) => <StatusBadge key={role.id} status="enabled">{role.name}</StatusBadge>)}</span>;
                } },
              ]}
              rows={group.definitions}
              ariaLabel={t("webui.iam.permissions.list.title")}
              getRowKey={(item) => item.key}
              emptyState={<p className="page-meta">{t("webui.iam.permissions.filterEmpty")}</p>}
              enhancements={{ density: "compact", stickyHeader: true }}
            />
          </div>
          ))}
        </ResourceIndex>
      </PageSection>
    </div>
  </PageFrame>;
}
