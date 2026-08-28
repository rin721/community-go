import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionTrigger, Button, CodeText, ConfirmActionTrigger, Drawer, EmptyState, Field, InlineAlert, InspectorPanel, PageFrame, PageHeader, PageSection, SearchInput, SelectField, StatusBadge, TreeView } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { createDepartment, departmentTree, updateDepartment, type DepartmentNode } from "./api";
import styles from "./organization.module.css";

// flatten expands the department tree into a stable depth-annotated list used by
// the parent select and the authoritative node lookup (kept exported for tests).
export function flatten(nodes: DepartmentNode[], depth = 0): Array<{ item: DepartmentNode; depth: number }> {
  return nodes.flatMap((item) => [{ item, depth }, ...flatten(item.children, depth + 1)]);
}

const getChildren = (node: DepartmentNode): DepartmentNode[] => node.children;
const getKey = (node: DepartmentNode): string => node.id;

// filterTree keeps nodes whose name/code match the query and preserves their
// ancestors so the directory stays navigable while searching.
function filterTree(nodes: DepartmentNode[], query: string): DepartmentNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return nodes;
  const matches = (node: DepartmentNode) => node.name.toLowerCase().includes(needle) || node.code.toLowerCase().includes(needle);
  const walk = (list: DepartmentNode[]): DepartmentNode[] => list.flatMap((node) => {
    const children = walk(node.children);
    return matches(node) || children.length > 0 ? [{ ...node, children }] : [];
  });
  return walk(nodes);
}

export default function DepartmentsPage() {
  const { t } = useWebUITranslation("webui.organization");
  const [items, setItems] = useState<DepartmentNode[]>([]);
  const [query, setQuery] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [editName, setEditName] = useState("");
  const [editParent, setEditParent] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    setMessage("");
    return departmentTree().then((nodes) => {
      setItems(nodes);
      setSelectedID((current) => (current && nodes.some((entry) => entry.id === current) ? current : nodes[0]?.id ?? ""));
    }).catch(() => setError(t("webui.organization.error")));
  }, [t]);

  useEffect(() => { void refresh(); }, [refresh]);

  const flat = useMemo(() => flatten(items), [items]);
  const total = flat.length;
  const filtered = useMemo(() => filterTree(items, query), [items, query]);
  const selected = flat.find((entry) => entry.item.id === selectedID)?.item;
  const parentPath = (node: DepartmentNode): string => {
    if (!node.parentId) return "—";
    return flat.find((entry) => entry.item.id === node.parentId)?.item.name ?? "—";
  };

  // Re-seed the edit form whenever the selected department changes (identity of
  // `selected` only changes when the tree reloads or the selection moves).
  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditParent(selected.parentId ?? "");
  }, [selected]);

  const parentChanged = selected ? (editParent === "") !== !selected.parentId || (editParent !== "" && editParent !== selected.parentId) : false;
  const canSaveEdit = selected ? editName.trim().length > 0 && (editName.trim() !== selected.name || parentChanged) : false;

  const saveEdit = () => {
    if (!selected || !canSaveEdit) return;
    void updateDepartment(selected, { name: editName.trim(), parentId: editParent === "" ? undefined : editParent, clearParent: editParent === "" })
      .then(() => { setMessage(t("webui.organization.departments.saved")); return refresh(); })
      .catch(() => setError(t("webui.organization.error")));
  };

  const submitCreate = () => {
    void createDepartment(code.trim(), name.trim(), parentId || undefined)
      .then(() => { setCreateOpen(false); setCode(""); setName(""); setParentId(""); setMessage(""); return refresh(); })
      .catch(() => setError(t("webui.organization.error")));
  };

  return <PageFrame variant="detail" className={styles.organizationModule}>
    <PageHeader eyebrow={t("webui.organization.brand")} title={t("webui.organization.departments.title")} description={t("webui.organization.departments.description")} actions={<ActionTrigger operationId="organization.departments.create" onAction={() => setCreateOpen(true)}>{t("webui.organization.departments.new")}</ActionTrigger>} />
    <div className="page-sections">
      <PageSection title={t("webui.organization.departments.directory.title")}>
        {error && <InlineAlert tone="danger" title={error} />}
        {message && <p className="page-meta">{message}</p>}
        <div className="split-workspace">
          <section className={`${styles.selectPane} split-workspace-pane`} aria-label={t("webui.organization.departments.directory.title")}>
            <div className={styles.selectPaneHead}>
              <span className={styles.selectPaneTitle}>{t("webui.organization.departments.directory.title")}</span>
              <span className={styles.selectPaneCount}>{t("webui.organization.departments.count", { count: total })}</span>
            </div>
            <div className={styles.selectPaneSearch}>
              <SearchInput value={query} onChange={setQuery} placeholder={t("webui.organization.departments.search")} label={t("webui.organization.departments.search")} />
            </div>
            <div className={styles.selectPaneBody}>
              {filtered.length === 0
                ? <EmptyState title={t("webui.organization.departments.empty.title")} detail={t("webui.organization.departments.empty.detail")} action={<ActionTrigger operationId="organization.departments.create" onAction={() => setCreateOpen(true)}>{t("webui.organization.departments.new")}</ActionTrigger>} />
                : <TreeView<DepartmentNode>
                    nodes={filtered}
                    getChildren={getChildren}
                    getKey={getKey}
                    renderNode={(item) => <>{item.name}{item.archived ? <CodeText value={t("webui.organization.archived")} /> : <CodeText value={item.code} />}</>}
                    selectedId={selectedID}
                    onSelect={setSelectedID}
                    ariaLabel={t("webui.organization.departments.directory.title")}
                    expandAll
                  />}
            </div>
          </section>
          <section className="split-workspace-pane">
            {selected ? (
              <div className={styles.departmentDetailGrid}>
                <InspectorPanel
                  title={selected.name}
                  status={selected.archived ? <StatusBadge status="revoked">{t("webui.organization.archived")}</StatusBadge> : <StatusBadge status="active">{t("webui.organization.active")}</StatusBadge>}
                  fields={[
                    { label: t("webui.organization.code"), value: selected.code, mono: true },
                    { label: t("webui.organization.parent"), value: parentPath(selected) },
                    { label: t("webui.organization.status"), value: selected.archived ? t("webui.organization.archived") : t("webui.organization.active") },
                  ]}
                />
                <div className={styles.editPane}>
                  <h4 className={styles.detailSectionTitle}>{t("webui.organization.departments.edit.title")}</h4>
                  <div className="field-grid">
                    <Field label={t("webui.organization.name")} value={editName} onChange={(event) => setEditName(event.target.value)} disabled={selected.archived} />
                    <SelectField label={t("webui.organization.parent")} value={editParent} onValueChange={setEditParent} options={[{ value: "", label: t("webui.organization.departments.root") }, ...flat.filter(({ item }) => item.id !== selected.id).map(({ item }) => ({ value: item.id, label: item.name }))]} />
                  </div>
                  <div className="row-actions">
                    <ActionTrigger operationId="organization.departments.update" disabled={!canSaveEdit} onAction={saveEdit}>{t("webui.organization.saveChanges")}</ActionTrigger>
                    <ConfirmActionTrigger
                      operationId="organization.departments.update"
                      variant="danger"
                      label={selected.archived ? t("webui.organization.restore") : t("webui.organization.archive")}
                      pendingLabel={t("webui.organization.saving")}
                      confirmTitle={selected.archived ? t("webui.organization.restore") : t("webui.organization.archive")}
                      confirmDescription={t("webui.organization.confirmArchive")}
                      confirmLabel={selected.archived ? t("webui.organization.restore") : t("webui.organization.archive")}
                      cancelLabel={t("webui.organization.cancel")}
                      closeLabel={t("webui.organization.cancel")}
                      onConfirm={() => updateDepartment(selected, { archived: !selected.archived }).then(refresh)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.detailPane}>
                <EmptyState title={t("webui.organization.departments.empty.title")} detail={t("webui.organization.departments.empty.detail")} action={<ActionTrigger operationId="organization.departments.create" onAction={() => setCreateOpen(true)}>{t("webui.organization.departments.new")}</ActionTrigger>} />
              </div>
            )}
          </section>
        </div>
      </PageSection>
    </div>
    <Drawer open={createOpen} title={t("webui.organization.departments.create.title")} description={t("webui.organization.departments.create.helper")} closeLabel={t("webui.organization.cancel")} onClose={() => setCreateOpen(false)}>
      <div className="form-panel">
        <Field label={t("webui.organization.code")} value={code} onChange={(event) => setCode(event.target.value)} />
        <Field label={t("webui.organization.name")} value={name} onChange={(event) => setName(event.target.value)} />
        <SelectField label={t("webui.organization.parent")} value={parentId} onValueChange={setParentId} options={[{ value: "", label: t("webui.organization.departments.root") }, ...flat.map(({ item }) => ({ value: item.id, label: item.name }))]} />
        <div className="row-actions">
          <ActionTrigger operationId="organization.departments.create" pendingLabel={t("webui.organization.saving")} disabled={!code.trim() || !name.trim()} onAction={submitCreate}>{t("webui.organization.create")}</ActionTrigger>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t("webui.organization.cancel")}</Button>
        </div>
      </div>
    </Drawer>
  </PageFrame>;
}
