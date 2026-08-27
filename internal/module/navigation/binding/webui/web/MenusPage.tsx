import { useEffect, useMemo, useState } from "react";
import { ActionTrigger, Check, CodeText, InspectorPanel, PageHeader, PageSection, StatusBadge, TreeView } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { useHostRuntime } from "@webui/sdk/runtime";
import { listMenus, updateMenu, type Menu, type MenuList } from "./api";
import styles from "./navigation.module.css";

export const effectivePolicy = (menu: Menu) => ({ enabled: menu.enabled, parent: menu.parentOverridden ? menu.parentId : menu.defaultParentId, order: menu.orderOverridden ? menu.order : menu.defaultOrder });

export type MenuTreeNode = { menu: Menu; children: MenuTreeNode[] };

// buildTree groups menus by effective parent (default or overridden) into a
// navigation tree for the directory view; roots are menus without a parent.
export function buildTree(menus: Menu[]): MenuTreeNode[] {
  const effectiveParent = (menu: Menu) => (menu.parentOverridden ? menu.parentId : menu.defaultParentId);
  const byParent = new Map<string, Menu[]>();
  for (const menu of menus) {
    const parent = effectiveParent(menu);
    if (parent) {
      const group = byParent.get(parent) ?? [];
      group.push(menu);
      byParent.set(parent, group);
    }
  }
  const orderBy = (group: Menu[]) => [...group].sort((left, right) => effectivePolicy(left).order - effectivePolicy(right).order);
  const toNode = (menu: Menu): MenuTreeNode => ({ menu, children: orderBy(byParent.get(menu.id) ?? []).map(toNode) });
  return orderBy(menus.filter((menu) => !effectiveParent(menu))).map(toNode);
}

export default function MenusPage() {
  const { t } = useWebUITranslation("webui.navigation");
  const { refreshManifest } = useHostRuntime();
  const [items, setItems] = useState<Menu[]>([]);
  const [revision, setRevision] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [parent, setParent] = useState("");
  const [order, setOrder] = useState("");
  const refresh = (): Promise<MenuList> => listMenus().then((value) => { setItems(value.items); setRevision(value.navigationRevision); setSelectedID((current) => current && value.items.some((menu) => menu.id === current) ? current : value.items[0]?.id ?? ""); return value; });
  const handleSaved = () => { void refresh().then(refreshManifest); };
  useEffect(() => { void refresh(); }, []);
  const tree = useMemo(() => buildTree(items), [items]);
  const selected = items.find((menu) => menu.id === selectedID);
  const title = (candidate: Menu) => candidate.moduleId === "navigation" ? t(candidate.titleMessageId) : candidate.titleMessageId;
  const select = (id: string) => {
    const menu = items.find((candidate) => candidate.id === id);
    if (!menu) return;
    setSelectedID(id);
    setEnabled(menu.enabled);
    setParent(menu.parentOverridden ? menu.parentId : "__default");
    setOrder(menu.orderOverridden ? String(menu.order) : "");
  };
  return <div className={`${styles.navigationModule} module-page`}>
    <PageHeader eyebrow={t("webui.navigation.brand")} title={t("webui.navigation.menus.title")} description={t("webui.navigation.menus.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.navigation.menus.list.kicker")} title={t("webui.navigation.menus.list.title")}>
        <p className="revision">{t("webui.navigation.revision")}: <CodeText value={revision.slice(0, 12)} /></p>
        <div className="org-tree-inspector">
          <TreeView<MenuTreeNode>
            nodes={tree}
            getChildren={(node) => node.children}
            getKey={(node) => node.menu.id}
            renderNode={(node) => { const disabled = !node.menu.enabled; return <>{title(node.menu)}{disabled ? <CodeText value={t("webui.navigation.disabled")} /> : null}</>; }}
            selectedId={selectedID}
            onSelect={select}
            ariaLabel={t("webui.navigation.menus.list.title")}
            expandAll
          />
          {selected && (
            <InspectorPanel
              title={title(selected)}
              fields={[
                { label: "id", value: selected.id, mono: true },
                { label: "route", value: selected.routeId, mono: true },
                { label: "module", value: selected.moduleId, mono: true },
                { label: t("webui.navigation.defaults"), value: `${selected.defaultParentId || "—"} / ${selected.defaultOrder}` },
              ]}
              status={<StatusBadge status={enabled ? "enabled" : "disabled"}>{enabled ? t("webui.navigation.enabled") : t("webui.navigation.disabled")}</StatusBadge>}
            >
              <div className="policy-controls">
                <Check checked={enabled} onChange={setEnabled}>{t("webui.navigation.enabled")}</Check>
                <label className="policy-field">{t("webui.navigation.parent")}<select className="field-input" value={parent} onChange={(event) => setParent(event.target.value)}><option value="__default">{t("webui.navigation.useDefault")}</option><option value="">{t("webui.navigation.root")}</option>{items.filter((candidate) => candidate.id !== selected.id).map((candidate) => <option value={candidate.id} key={candidate.id}>{title(candidate)}</option>)}</select></label>
                <label className="policy-field">{t("webui.navigation.order")}<input type="number" className="field-input" value={order} placeholder={String(selected.defaultOrder)} onChange={(event) => setOrder(event.target.value)} /></label>
                <ActionTrigger operationId="navigation.menus.update" onAction={() => updateMenu(selected, enabled, parent === "__default" ? undefined : parent, order === "" ? undefined : Number(order)).then(handleSaved)}>{t("webui.navigation.save")}</ActionTrigger>
              </div>
            </InspectorPanel>
          )}
        </div>
      </PageSection>
    </div>
  </div>;
}