import { useCallback, useEffect, useState } from "react";
import { ActionTrigger, Field, InlineAlert, PageHeader, PageSection, RevealList, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { createDepartment, departmentTree, updateDepartment, type DepartmentNode } from "./api";
import styles from "./organization.module.css";

// flatten expands the department tree into a stable depth-annotated list used by
// both the create-form parent select and the directory rendering.
function flatten(nodes: DepartmentNode[], depth = 0): Array<{ item: DepartmentNode; depth: number }> {
  return nodes.flatMap((item) => [{ item, depth }, ...flatten(item.children, depth + 1)]);
}

export default function DepartmentsPage() {
  const { t } = useWebUITranslation("webui.organization");
  const [items, setItems] = useState<DepartmentNode[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(() => departmentTree().then(setItems).catch(() => setError(t("webui.organization.error"))), [t]);
  useEffect(() => { void refresh(); }, [refresh]);
  const flat = flatten(items);
  return <div className={`${styles.organizationModule} module-page`}>
    <PageHeader eyebrow={t("webui.organization.brand")} title={t("webui.organization.departments.title")} description={t("webui.organization.departments.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.organization.departments.create.kicker")} title={t("webui.organization.departments.create.title")}>
        <div className="toolbar">
          <Field label={t("webui.organization.code")} value={code} onChange={(event) => setCode(event.target.value)} />
          <Field label={t("webui.organization.name")} value={name} onChange={(event) => setName(event.target.value)} />
          <label className="form-field"><span>{t("webui.organization.parent")}</span><select className="field-input" value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">—</option>{flat.map(({ item }) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <ActionTrigger operationId="organization.departments.create" onAction={() => createDepartment(code, name, parentId || undefined).then(() => { setCode(""); setName(""); setParentId(""); setError(""); return refresh(); }).catch(() => setError(t("webui.organization.error")))}>{t("webui.organization.create")}</ActionTrigger>
        </div>
      </PageSection>
      <PageSection kicker={t("webui.organization.departments.list.kicker")} title={t("webui.organization.departments.list.title")}>
        {error && <InlineAlert tone="danger" title={error} />}
        <RevealList className="card-grid">
          {flat.map(({ item, depth }) => <div className="item-card" key={item.id}><div style={{ paddingLeft: depth * 18 }}><h3>{item.name}</h3><p>{item.code}</p></div><div className="item-card-meta"><StatusPill state={item.active && !item.archived ? "available" : "unavailable"}>{item.archived ? t("webui.organization.archived") : t("webui.organization.active")}</StatusPill><ActionTrigger operationId="organization.departments.update" variant="secondary" onAction={() => updateDepartment(item, { archived: !item.archived }).then(refresh).catch(() => setError(t("webui.organization.error")))}>{item.archived ? t("webui.organization.restore") : t("webui.organization.archive")}</ActionTrigger></div></div>)}
        </RevealList>
      </PageSection>
    </div>
  </div>;
}

export { flatten };