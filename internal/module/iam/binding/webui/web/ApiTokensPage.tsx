import { useCallback, useEffect, useState } from "react";
import { ActionTrigger, Button, DataTable, EmptyState, Field, InlineAlert, PageHeader, PageSection, SelectField, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { createApiToken, disableApiToken, enableApiToken, listApiTokens, loadSession, revokeApiToken, rotateApiToken, updateApiToken, type ApiTokenView } from "./api";
import styles from "./iam.module.css";

// ApiTokensPage provides full API-Token management (080): status-filtered list,
// creation wizard scoped to the account's own permissions, one-time secret
// display, and disable/enable/rotate/revoke lifecycle actions.
export default function ApiTokensPage() {
  const { t } = useWebUITranslation("webui.iam");
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

  const refresh = useCallback((filter = status) => {
    void listApiTokens(filter).then((value) => setTokens(value.items)).catch(() => undefined);
  }, [status]);

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
    <PageHeader eyebrow={t("webui.iam.access.title")} title={t("webui.iam.apiTokens.title")} description={t("webui.iam.apiTokens.description")} actions={restricted ? <StatusPill state="degraded">{t("webui.iam.apiTokens.restricted")}</StatusPill> : undefined} />
    <div className="page-sections">
      {restricted && <InlineAlert tone="warning" title={t("webui.iam.apiTokens.restricted")} detail={t("webui.iam.apiTokens.restrictedDetail")} />}
      {secret && <InlineAlert tone="success" title={t("webui.iam.apiTokens.secretTitle")} detail={secret} />}
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
            {availableScopes.map((scope) => (
              <label key={scope} className="page-check">
                <input type="checkbox" checked={selectedScopes.includes(scope)} onChange={() => toggleScope(scope)} />
                <span>{scope}</span>
              </label>
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
        <DataTable
          ariaLabel={t("webui.iam.apiTokens.listTitle")}
          emptyState={<EmptyState title={t("webui.iam.apiTokens.empty")} />}
          columns={[
            { id: "name", header: t("webui.iam.apiTokens.name"), cell: (row) => <><strong>{row.name}</strong>{row.description ? <p className="page-meta">{row.description}</p> : null}</> },
            { id: "scopes", header: t("webui.iam.apiTokens.scopes"), cell: (row) => row.scopes.join(", ") || "—" },
            { id: "status", header: t("webui.iam.apiTokens.statusHeader"), cell: (row) => <StatusPill state={row.status === "active" ? "available" : row.status === "disabled" ? "degraded" : "unavailable"}>{t(`webui.iam.apiTokens.status.${row.status}`)}</StatusPill> },
            { id: "expiresAt", header: t("webui.iam.apiTokens.expiresHeader"), cell: (row) => row.expiresAt ? new Date(row.expiresAt).toLocaleString() : "—" },
            { id: "lastUsed", header: t("webui.iam.apiTokens.lastUsed"), cell: (row) => row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "—" },
            { id: "actions", header: "", cell: (row) => (
              <div className="toolbar-actions">
                {row.status === "disabled" ? <ActionTrigger operationId="iam.api-tokens.enable" onAction={() => { void enableApiToken(row.id).then(() => refresh()); }} variant="secondary">{t("webui.iam.apiTokens.enable")}</ActionTrigger> : <ActionTrigger operationId="iam.api-tokens.disable" onAction={() => { void disableApiToken(row.id).then(() => refresh()); }} variant="secondary">{t("webui.iam.apiTokens.disable")}</ActionTrigger>}
                <ActionTrigger operationId="iam.api-tokens.rotate" onAction={() => { void rotateApiToken(row.id).then((issued) => setSecret(issued.secret)).then(() => refresh()); }} variant="secondary">{t("webui.iam.apiTokens.rotate")}</ActionTrigger>
                {row.status === "active" && <ActionTrigger operationId="iam.api-tokens.update" onAction={() => { void expireToken(row); }} variant="secondary">{t("webui.iam.apiTokens.expireNow")}</ActionTrigger>}
                {row.status !== "revoked" && <ActionTrigger operationId="iam.api-tokens.revoke" onAction={() => { void revokeApiToken(row.id).then(() => refresh()); }} variant="danger">{t("webui.iam.apiTokens.revoke")}</ActionTrigger>}
              </div>
            ) },
          ]}
          rows={tokens}
          getRowKey={(row) => row.id}
        />
      </PageSection>
    </div>
  </div>;
}