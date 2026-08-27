import { useCallback, useEffect, useState } from "react";
import { ActionTrigger, CodeText, Field, InlineAlert, InspectorPanel, PageHeader, PageSection, SelectField, StatusBadge, TreeView } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { createDepartment, departmentTree, updateDepartment, type Department, type DepartmentNode } from "./api";
import styles from "./organization.module.css";

// flatten expands the department tree into a stable depth-annotated list used by
// both the create-form parent select and Inspector lookup.
function flatten(nodes: DepartmentNode[], depth = 0): Array<{ item: DepartmentNode; depth: number }> {
  return nodes.flatMap((item) => [{ item, depth }, ...flatten(item.children, depth + 1)]);
}

const getChildren = (node: DepartmentNode): DepartmentNode[] => node.children;
const getKey = (node: DepartmentNode): string => node.id;

export default function DepartmentsPage() {
  const { t } = useWebUITranslation("webui.organization");
  const [items, setItems] = useState<DepartmentNode[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(() => departmentTree().then(setItems).catch(() => setError(t("webui.organization.error"))), [t]);
  useEffect(() => { void refresh(); }, [refresh]);
  const flat = flatten(items);
  const selected = flat.find((entry) => entry.item.id === selectedID)?.item;
  const toggleArchive = (item: Department) => {
    void updateDepartment(item, { archived: !item.archived }).then(refresh).catch(() => setError(t("webui.organization.error")));
  };
  return <div className={`${styles.organizationModule} module-page`}>
    <PageHeader eyebrow={t("webui.organization.brand")} title={t("webui.organization.departments.title")} description={t("webui.organization.departments.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.organization.departments.create.kicker")} title={t("webui.organization.departments.create.title")}>
        <div className="toolbar">
          <Field label={t("webui.organization.code")} value={code} onChange={(event) => setCode(event.target.value)} />
          <Field label={t("webui.organization.name")} value={name} onChange={(event) => setName(event.target.value)} />
          <SelectField label={t("webui.organization.parent")} value={parentId} onValueChange={setParentId} options={[{ value: "", label: "—" }, ...flat.map(({ item }) => ({ value: item.id, label: item.name }))]} />
          <ActionTrigger operationId="organization.departments.create" onAction={() => createDepartment(code, name, parentId || undefined).then(() => { setCode(""); setName(""); setParentId(""); setError(""); return refresh(); }).catch(() => setError(t("webui.organization.error")))}>{t("webui.organization.create")}</ActionTrigger>
        </div>
      </PageSection>
      <PageSection kicker={t("webui.organization.departments.list.kicker")} title={t("webui.organization.departments.list.title")}>
        {error && <InlineAlert tone="danger" title={error} />}
        <div className="org-tree-inspector">
          <TreeView<DepartmentNode>
            nodes={items}
            getChildren={getChildren}
            getKey={getKey}
            renderNode={(item) => <>{item.name} <CodeText value={item.code} /></>}
            selectedId={selectedID}
            onSelect={setSelectedID}
            ariaLabel={t("webui.organization.departments.title")}
            expandAll
          />
          {selected && (
            <InspectorPanel
              title={selected.name}
              fields={[
                { label: t("webui.organization.code"), value: selected.code, mono: true },
                { label: t("webui.organization.parent"), value: flat.find((entry) => entry.item.id === selected.parentId)?.item.name ?? "—" },
                { label: t("webui.organization.status"), value: selected.archived ? t("webui.organization.archived") : t("webui.organization.active") },
              ]}
              status={selected.archived ? <StatusBadge status="revoked">{t("webui.organization.archived")}</StatusBadge> : <StatusBadge status="active">{t("webui.organization.active")}</StatusBadge>}
              actions={<ActionTrigger operationId="organization.departments.update" variant="secondary" onAction={() => toggleArchive(selected)}>{selected.archived ? t("webui.organization.restore") : t("webui.organization.archive")}</ActionTrigger>}
            />
          )}
        </div>
      </PageSection>
    </div>
  </div>;
}

export { flatten };