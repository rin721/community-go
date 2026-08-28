import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionTrigger, Check, CodeText, EmptyState, InlineAlert, PageFrame, PageHeader, PageSection, StatusBadge, TreeView } from "@webui/sdk/ui";
import { useWebUITranslation, translateMessage, ensureRouteLocale } from "@webui/sdk/i18n";
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

// menuTitle resolves any registered menu title through the host cross-namespace
// translator (navigation owns pages, other modules own their titles, so raw
// titleMessageId must never leak into the DOM).
const menuTitle = (menu: Menu): string => translateMessage(menu.titleMessageId);

export default function MenusPage() {
  const { t } = useWebUITranslation("webui.navigation");
  const { refreshManifest } = useHostRuntime();
  const [items, setItems] = useState<Menu[]>([]);
  const [revision, setRevision] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [parent, setParent] = useState("");
  const [order, setOrder] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback((): Promise<MenuList> => listMenus().then(async (value) => {
    // Load every namespace referenced by the menu titles so translateMessage
    // can resolve them (host only loads the current route namespace otherwise).
    const ids = new Set(value.items.map((menu) => menu.titleMessageId));
    await Promise.all([...ids].map((id) => ensureRouteLocale({ titleMessageId: id }).catch(() => undefined)));
    setItems(value.items);
    setRevision(value.navigationRevision);
    setSelectedID((current) => (current && value.items.some((menu) => menu.id === current) ? current : value.items[0]?.id ?? ""));
    return value;
  }), []);

  const handleSaved = () => { void refresh().then(refreshManifest); };
  useEffect(() => { void refresh(); }, [refresh]);
  const tree = useMemo(() => buildTree(items), [items]);
  const selected = items.find((menu) => menu.id === selectedID);

  const select = (id: string) => {
    const menu = items.find((candidate) => candidate.id === id);
    if (!menu) return;
    setSelectedID(id);
    setEnabled(menu.enabled);
    setParent(menu.parentOverridden ? menu.parentId : "__default");
    setOrder(menu.orderOverridden ? String(menu.order) : "");
    setMessage("");
    setError("");
  };

  const selectTitle = selected ? menuTitle(selected) : "";

  const save = () => {
    if (!selected) return;
    void updateMenu(selected, enabled, parent === "__default" ? undefined : parent, order === "" ? undefined : Number(order))
      .then(() => { setMessage(t("webui.navigation.menus.saved")); handleSaved(); })
      .catch(() => setError(t("webui.navigation.error")));
  };

  const flatCount = tree.reduce((count, node) => count + countNodes(node), 0);
  return <PageFrame variant="detail" className={styles.navigationModule}>
    <PageHeader eyebrow={t("webui.navigation.brand")} title={t("webui.navigation.menus.title")} description={t("webui.navigation.menus.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.navigation.menus.list.kicker")} title={t("webui.navigation.menus.list.title")}>
        <p className="page-meta">{t("webui.navigation.revision")}: <CodeText value={revision.slice(0, 12)} /></p>
        {message && <p className="page-meta">{message}</p>}
        {error && <InlineAlert tone="danger" title={error} />}
        <div className="split-workspace">
          <section className={`${styles.navPane} split-workspace-pane`} aria-label={t("webui.navigation.menus.list.title")}>
            <div className={styles.navPaneHead}>
              <span className={styles.navPaneTitle}>{t("webui.navigation.menus.list.kicker")}</span>
              <span className={styles.navPaneCount}>{String(flatCount)}</span>
            </div>
            <div className={styles.navPaneBody}>
              {tree.length === 0
                ? <EmptyState title={t("webui.navigation.menus.empty")} />
                : <TreeView<MenuTreeNode>
                    nodes={tree}
                    getChildren={(node) => node.children}
                    getKey={(node) => node.menu.id}
                    renderNode={(node) => { const disabled = !node.menu.enabled; return <>{menuTitle(node.menu)}{disabled ? <CodeText value={t("webui.navigation.disabled")} /> : null}</>; }}
                    selectedId={selectedID}
                    onSelect={select}
                    ariaLabel={t("webui.navigation.menus.list.title")}
                    expandAll
                  />}
            </div>
          </section>
          <section className="split-workspace-pane">
            {selected ? (
              <div className={styles.navDetail}>
                <div className={styles.navDetailHead}>
                  <span className={styles.navPaneTitle}>{selectTitle}</span>
                  <StatusBadge status={enabled ? "enabled" : "disabled"}>{enabled ? t("webui.navigation.enabled") : t("webui.navigation.disabled")}</StatusBadge>
                </div>
                <div className="inspector-panel-fields">
                  <div className="inspector-field"><span className="inspector-field-label">{"id"}</span><CodeText value={selected.id} /></div>
                  <div className="inspector-field"><span className="inspector-field-label">{"route"}</span><CodeText value={selected.routeId} /></div>
                  <div className="inspector-field"><span className="inspector-field-label">{t("webui.navigation.route")}</span><span className="inspector-field-value">{selected.moduleId}</span></div>
                  <div className="inspector-field"><span className="inspector-field-label">{t("webui.navigation.defaults")}</span><span className="inspector-field-value">{selected.defaultParentId || "—"} / {selected.defaultOrder}</span></div>
                </div>
                <div className={styles.policyStack}>
                  <div className={styles.policyField}><Check checked={enabled} onChange={setEnabled}>{t("webui.navigation.enabled")}</Check></div>
                  <label className={styles.policyField}>{t("webui.navigation.parent")}<select className="field-input" value={parent} onChange={(event) => setParent(event.target.value)}><option value="__default">{t("webui.navigation.useDefault")}</option><option value="">{t("webui.navigation.root")}</option>{items.filter((candidate) => candidate.id !== selected.id).map((candidate) => <option value={candidate.id} key={candidate.id}>{menuTitle(candidate)}</option>)}</select></label>
                  <label className={styles.policyField}>{t("webui.navigation.order")}<input type="number" className="field-input" value={order} placeholder={String(selected.defaultOrder)} onChange={(event) => setOrder(event.target.value)} /></label>
                  <div className="row-actions">
                    <ActionTrigger operationId="navigation.menus.update" pendingLabel={t("webui.navigation.save")} onAction={save}>{t("webui.navigation.save")}</ActionTrigger>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.navDetail}>
                <EmptyState title={t("webui.navigation.menus.empty")} />
              </div>
            )}
          </section>
        </div>
      </PageSection>
    </div>
  </PageFrame>;
}

function countNodes(node: MenuTreeNode): number {
  return 1 + node.children.reduce((count, child) => count + countNodes(child), 0);
}
