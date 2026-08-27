import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionTrigger, Button, CodeText, ConfirmDialog, DataTable, Drawer, EmptyState, Field, formatDateTime, InlineAlert, PageHeader, PageSection, SearchInput, StatusBadge } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { createPosition, listPositions, updatePosition, type Position } from "./api";
import styles from "./organization.module.css";

export default function PositionsPage() {
  const { t } = useWebUITranslation("webui.organization");
  const [items, setItems] = useState<Position[]>([]);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [renameTarget, setRenameTarget] = useState<Position | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingArchive, setPendingArchive] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setMessage("");
    return listPositions().then(setItems).catch(() => setError(t("webui.organization.error"))).finally(() => setLoading(false));
  }, [t]);
  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle) || item.code.toLowerCase().includes(needle));
  }, [items, query]);

  const statusCell = (item: Position) => item.archived
    ? <StatusBadge status="revoked">{t("webui.organization.archived")}</StatusBadge>
    : item.active
      ? <StatusBadge status="active">{t("webui.organization.active")}</StatusBadge>
      : <StatusBadge status="disabled">{t("webui.organization.inactive")}</StatusBadge>;

  const submitCreate = () => {
    void createPosition(code.trim(), name.trim()).then(() => { setCreateOpen(false); setCode(""); setName(""); setMessage(""); return refresh(); }).catch(() => setError(t("webui.organization.error")));
  };
  const submitRename = () => {
    if (!renameTarget || !renameValue.trim() || renameValue.trim() === renameTarget.name) { setRenameTarget(null); return; }
    void updatePosition(renameTarget, { name: renameValue.trim() }).then(() => { setRenameTarget(null); setMessage(t("webui.organization.positions.saved")); return refresh(); }).catch(() => setError(t("webui.organization.error")));
  };
  const runArchive = () => {
    const row = pendingArchive;
    if (!row) return;
    setPendingArchive(null);
    void updatePosition(row, { archived: !row.archived }).then(() => refresh()).catch(() => setError(t("webui.organization.error")));
  };

  return <div className={`${styles.organizationModule} module-page`}>
    <PageHeader eyebrow={t("webui.organization.brand")} title={t("webui.organization.positions.title")} description={t("webui.organization.positions.description")} actions={<ActionTrigger operationId="organization.positions.create" onAction={() => setCreateOpen(true)}>{t("webui.organization.positions.new")}</ActionTrigger>} />
    <div className="page-sections">
      <PageSection>
        {error && <InlineAlert tone="danger" title={error} />}
        {message && <p className="page-meta">{message}</p>}
        <div className="data-toolbar">
          <div className="data-toolbar-filters">
            <SearchInput value={query} onChange={setQuery} placeholder={t("webui.organization.positions.search")} label={t("webui.organization.positions.search")} />
            <span className="filter-bar-count">{t("webui.organization.positions.count", { count: filtered.length })}</span>
          </div>
        </div>
        <DataTable<Position>
          columns={[
            { id: "code", header: t("webui.organization.code"), cell: (item) => <CodeText value={item.code} /> },
            { id: "name", header: t("webui.organization.name"), cell: (item) => item.name },
            { id: "status", header: t("webui.organization.status"), cell: statusCell },
            { id: "createdAt", header: t("webui.organization.createdAt"), cell: (item) => formatDateTime(item.createdAt) },
          ]}
          rows={filtered}
          ariaLabel={t("webui.organization.positions.title")}
          loading={loading}
          loadingLabel={t("webui.organization.saving")}
          getRowKey={(item) => item.id}
          emptyState={<EmptyState title={t("webui.organization.positions.empty.title")} detail={t("webui.organization.positions.empty.detail")} action={<ActionTrigger operationId="organization.positions.create" onAction={() => setCreateOpen(true)}>{t("webui.organization.positions.new")}</ActionTrigger>} />}
          enhancements={{
            density: "compact",
            stickyHeader: true,
            renderRowMenu: (item) => [
              { key: "rename", label: t("webui.organization.positions.rename"), onSelect: () => { setRenameTarget(item); setRenameValue(item.name); } },
              { key: "archive", label: item.archived ? t("webui.organization.restore") : t("webui.organization.archive"), danger: true, onSelect: () => setPendingArchive(item) },
            ],
          }}
        />
      </PageSection>
    </div>
    <Drawer open={createOpen} title={t("webui.organization.positions.create.title")} description={t("webui.organization.positions.create.helper")} closeLabel={t("webui.organization.cancel")} onClose={() => setCreateOpen(false)}>
      <div className="form-panel">
        <Field label={t("webui.organization.code")} value={code} onChange={(event) => setCode(event.target.value)} />
        <Field label={t("webui.organization.name")} value={name} onChange={(event) => setName(event.target.value)} />
        <div className="row-actions">
          <ActionTrigger operationId="organization.positions.create" pendingLabel={t("webui.organization.saving")} disabled={!code.trim() || !name.trim()} onAction={submitCreate}>{t("webui.organization.create")}</ActionTrigger>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t("webui.organization.cancel")}</Button>
        </div>
      </div>
    </Drawer>
    <Drawer open={Boolean(renameTarget)} title={t("webui.organization.positions.rename.title")} description={renameTarget ? renameTarget.name : undefined} closeLabel={t("webui.organization.cancel")} onClose={() => setRenameTarget(null)}>
      <div className="form-panel">
        <Field label={t("webui.organization.name")} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
        <div className="row-actions">
          <ActionTrigger operationId="organization.positions.update" pendingLabel={t("webui.organization.saving")} disabled={!renameValue.trim() || renameValue.trim() === renameTarget?.name} onAction={submitRename}>{t("webui.organization.saveChanges")}</ActionTrigger>
          <Button variant="secondary" onClick={() => setRenameTarget(null)}>{t("webui.organization.cancel")}</Button>
        </div>
      </div>
    </Drawer>
    <ConfirmDialog
      open={Boolean(pendingArchive)}
      title={pendingArchive?.archived ? t("webui.organization.restore") : t("webui.organization.archive")}
      description={t("webui.organization.confirmArchive")}
      confirmLabel={pendingArchive?.archived ? t("webui.organization.restore") : t("webui.organization.archive")}
      cancelLabel={t("webui.organization.cancel")}
      closeLabel={t("webui.organization.cancel")}
      onConfirm={runArchive}
      onCancel={() => setPendingArchive(null)}
    />
  </div>;
}