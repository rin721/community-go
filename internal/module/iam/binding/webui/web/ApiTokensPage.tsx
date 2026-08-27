import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionTrigger, Button, CodeText, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, formatDateTime, InlineAlert, PageHeader, PageSection, SelectField, StatusBadge } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { useListQueryParams } from "@webui/sdk/query";
import { createApiToken, disableApiToken, enableApiToken, listApiTokens, loadSession, revokeApiToken, rotateApiToken, updateApiToken, type ApiTokenView } from "./api";
import styles from "./iam.module.css";

// groupScopesByModule groups available scopes by their owner prefix
// (e.g. "iam:account:self:read" -> "iam") for the creation matrix (082 REQ-022/040).
export const groupScopesByModule = (scopes: string[]): Array<{ ownerModuleId: string; scopes: string[] }> => {
  const byOwner = new Map<string, string[]>();
  for (const scope of [...scopes].sort()) {
    const owner = scope.includes(":") ? scope.split(":")[0] : "other";
    const group = byOwner.get(owner) ?? [];
    group.push(scope);
    byOwner.set(owner, group);
  }
  return [...byOwner.entries()].map(([ownerModuleId, items]) => ({ ownerModuleId, scopes: items }));
};

// ApiTokensPage provides full API-Token management (080): status-filtered list,
// creation wizard scoped to the account's own permissions, one-time secret
// display, and disable/enable/rotate/revoke lifecycle actions.
export default function ApiTokensPage() {
  const { t } = useWebUITranslation("webui.iam");
  const { t: hostT } = useWebUITranslation("webui.host");
  const listQuery = useListQueryParams<{}>({ filters: {} });
  const [tokens, setTokens] = useState<ApiTokenView[]>([]);
  const [status, setStatus] = useState("all");
  const [availableScopes, setAvailableScopes] = useState<string[]>([]);
  const [restricted, setRestricted] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [neverExpires, setNeverExpires] = useState(false);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [pendingRevokeID, setPendingRevokeID] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const scopeGroups = useMemo(() => groupScopesByModule(availableScopes), [availableScopes]);

  const refresh = useCallback((filter = status) => {
    setLoading(true);
    setLoadError(false);
    return listApiTokens(filter, 0, 50, listQuery.sort ? `${listQuery.sort.key}:${listQuery.sort.direction}` : undefined).then((value) => setTokens(value.items)).catch(() => { setTokens([]); setLoadError(true); }).finally(() => setLoading(false));
  }, [listQuery.sort, status]);

  useEffect(() => {
    void loadSession().then((value) => {
      setAvailableScopes(value.identity.permissions);
      setRestricted(value.identity.mustChangePassword);
    }).catch(() => undefined);
    void refresh();
  }, [refresh]);

  const toggleScope = (scope: string) => {
    setSelectedScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]));
  };

  const submit = () => {
    setMessage("");
    setSecret("");
    createApiToken(name.trim(), description.trim(), selectedScopes, neverExpires ? undefined : expiresAt || undefined)
      .then((issued) => { setSecret(issued.secret); setName(""); setDescription(""); setSelectedScopes([]); setExpiresAt(""); refresh(); })
      .catch(() => setMessage(t("webui.iam.apiTokens.error")));
  };

  const expireToken = (row: ApiTokenView) => {
    // PATCH keeps name/description and clears expiry via neverExpires when requested.
    void updateApiToken(row.id, row.name, row.description || "", undefined, false).then(() => refresh());
  };

  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.access.title")} title={t("webui.iam.apiTokens.title")} description={t("webui.iam.apiTokens.description")} actions={restricted ? <StatusBadge status="degraded">{t("webui.iam.apiTokens.restricted")}</StatusBadge> : undefined} />
    <div className="page-sections">
      {restricted && <InlineAlert tone="warning" title={t("webui.iam.apiTokens.restricted")} detail={t("webui.iam.apiTokens.restrictedDetail")} />}
      {secret && <InlineAlert tone="success" title={t("webui.iam.apiTokens.secretTitle")} detail={<CodeText value={secret} copyable copyLabel={t("webui.iam.apiTokens.copySecret")} />} />}
      {message && <p className="page-meta" role="status">{message}</p>}

      <PageSection kicker={t("webui.iam.apiTokens.createKicker")} title={t("webui.iam.apiTokens.createTitle")}>
        <div className="form-panel">
          <Field label={t("webui.iam.apiTokens.name")} required value={name} onChange={(event) => setName(event.target.value)} />
          <Field label={t("webui.iam.apiTokens.descriptionLabel")} value={description} onChange={(event) => setDescription(event.target.value)} />
          <SelectField label={t("webui.iam.apiTokens.expiresAt")} value={neverExpires ? "never" : "custom"} options={[
            { value: "custom", label: t("webui.iam.apiTokens.customExpiry") },
            { value: "never", label: t("webui.iam.apiTokens.neverExpire") },
          ]} onValueChange={(value) => setNeverExpires(value === "never")} />
          {!neverExpires && <Field label={t("webui.iam.apiTokens.expiryValue")} type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />}
          <fieldset>
            <legend>{t("webui.iam.apiTokens.scopes")}</legend>
            {availableScopes.length === 0 && <p className="page-meta">{t("webui.iam.apiTokens.scopeEmpty")}</p>}
            {scopeGroups.map((group) => (
              <div className="api-token-scope-group" key={group.ownerModuleId}>
                <h4 className="api-token-scope-owner">{group.ownerModuleId}</h4>
                {group.scopes.map((scope) => (
                  <label key={scope} className="page-check">
                    <input type="checkbox" checked={selectedScopes.includes(scope)} onChange={() => toggleScope(scope)} />
                    <span>{scope}</span>
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
          <div className="toolbar-actions">
            <Button onClick={submit} disabled={restricted || !name.trim() || selectedScopes.length === 0}>{t("webui.iam.apiTokens.submit")}</Button>
          </div>
        </div>
      </PageSection>

      <PageSection kicker={t("webui.iam.apiTokens.listKicker")} title={t("webui.iam.apiTokens.listTitle")}>
        <SelectField label={t("webui.iam.apiTokens.filter")} value={status} options={[
          { value: "all", label: t("webui.iam.apiTokens.filter.all") },
          { value: "active", label: t("webui.iam.apiTokens.status.active") },
          { value: "disabled", label: t("webui.iam.apiTokens.status.disabled") },
          { value: "expired", label: t("webui.iam.apiTokens.status.expired") },
          { value: "revoked", label: t("webui.iam.apiTokens.status.revoked") },
        ]} onValueChange={(value) => { setStatus(value); refresh(value); }} />
        <div className="toolbar accounts-sort-bar">
          <SelectField label={t("webui.iam.accounts.sortBy")} value={listQuery.sort?.key ?? ""} options={[
            { value: "", label: t("webui.iam.accounts.sortNone") },
            { value: "name", label: t("webui.iam.apiTokens.name") },
            { value: "createdAt", label: t("webui.iam.sessions.createdAt") },
            { value: "expiresAt", label: t("webui.iam.apiTokens.expiresHeader") },
            { value: "lastUsedAt", label: t("webui.iam.apiTokens.lastUsed") },
          ]} onValueChange={(value) => listQuery.setSort(value ? { key: value, direction: listQuery.sort?.direction ?? "desc" } : null)} />
          {listQuery.sort && <SelectField label={t("webui.iam.accounts.sortDirection")} value={listQuery.sort.direction} options={[
            { value: "asc", label: t("webui.iam.accounts.sortAsc") },
            { value: "desc", label: t("webui.iam.accounts.sortDesc") },
          ]} onValueChange={(value) => listQuery.setSort({ key: listQuery.sort?.key ?? "createdAt", direction: value === "desc" ? "desc" : "asc" })} />}
        </div>
        {loadError && <ErrorState kind="connectivity" title={hostT("webui.host.route.error.title")} detail={hostT("webui.host.route.error.detail")} action={<Button variant="secondary" onClick={() => void refresh()}>{hostT("webui.host.retry")}</Button>} />}
        <DataTable
          ariaLabel={t("webui.iam.apiTokens.listTitle")}
          loading={loading}
          loadingLabel={t("webui.host.page.loading.label")}
          emptyState={loadError ? null : <EmptyState title={t("webui.iam.apiTokens.empty")} />}
          columns={[
            { id: "name", header: t("webui.iam.apiTokens.name"), cell: (row) => <><strong>{row.name}</strong>{row.description ? <p className="page-meta">{row.description}</p> : null}</> },
            { id: "scopes", header: t("webui.iam.apiTokens.scopes"), cell: (row) => row.scopes.join(", ") || "—" },
            { id: "status", header: t("webui.iam.apiTokens.statusHeader"), cell: (row) => <StatusBadge status={row.status === "active" ? "active" : row.status === "disabled" ? "disabled" : row.status === "expired" ? "expired" : "revoked"}>{t(`webui.iam.apiTokens.status.${row.status}`)}</StatusBadge> },
            { id: "expiresAt", header: t("webui.iam.apiTokens.expiresHeader"), cell: (row) => formatDateTime(row.expiresAt) },
            { id: "lastUsed", header: t("webui.iam.apiTokens.lastUsed"), cell: (row) => formatDateTime(row.lastUsedAt) },
            // 083 PAGE-083-006: primary action inline, rest in row menu with danger isolated at end
            { id: "primary", header: t("webui.iam.apiTokens.actions"), cell: (row) => row.status === "disabled"
              ? <ActionTrigger operationId="iam.api-tokens.enable" onAction={() => { void enableApiToken(row.id).then(() => refresh()); }} variant="secondary">{t("webui.iam.apiTokens.enable")}</ActionTrigger>
              : <ActionTrigger operationId="iam.api-tokens.disable" onAction={() => { void disableApiToken(row.id).then(() => refresh()); }} variant="secondary">{t("webui.iam.apiTokens.disable")}</ActionTrigger> },
          ]}
          rows={tokens}
          getRowKey={(row) => row.id}
          enhancements={{
            density: "compact",
            stickyHeader: true,
            renderRowMenu: (row) => {
              const items: Array<{ key: string; label: string; onSelect: () => void; danger?: boolean }> = [];
              items.push({ key: "rotate", label: t("webui.iam.apiTokens.rotate"), onSelect: () => { void rotateApiToken(row.id).then((issued) => setSecret(issued.secret)).then(() => refresh()); } });
              if (row.status === "active") items.push({ key: "expire", label: t("webui.iam.apiTokens.expireNow"), onSelect: () => { void expireToken(row); } });
              if (row.status !== "revoked") items.push({ key: "revoke", label: t("webui.iam.apiTokens.revoke"), danger: true, onSelect: () => setPendingRevokeID(row.id) });
              return items;
            },
            columnMenuLabel: t("webui.iam.apiTokens.more"),
          }}
        />
        <ConfirmDialog
          open={Boolean(pendingRevokeID)}
          title={t("webui.iam.apiTokens.revoke")}
          description={t("webui.iam.apiTokens.error")}
          confirmLabel={t("webui.iam.apiTokens.revoke")}
          cancelLabel={t("webui.iam.cancel")}
          closeLabel={t("webui.iam.cancel")}
          onConfirm={() => { void revokeApiToken(pendingRevokeID).then(() => refresh()).finally(() => setPendingRevokeID("")); }}
          onCancel={() => setPendingRevokeID("")}
        />
      </PageSection>
    </div>
  </div>;
}
