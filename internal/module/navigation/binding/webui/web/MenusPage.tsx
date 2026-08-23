import { useEffect, useState } from "react";
import { ActionTrigger, PageHeader, PageSection, StatusPill, Surface } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { useHostRuntime } from "@webui/sdk/runtime";
import { listMenus, updateMenu, type Menu } from "./api";
import styles from "./navigation.module.css";

export default function MenusPage() {
  const { t } = useWebUITranslation("webui.navigation");
  const { refreshManifest } = useHostRuntime();
  const [items, setItems] = useState<Menu[]>([]);
  const [revision, setRevision] = useState("");
  const refresh = () => listMenus().then((value) => { setItems(value.items); setRevision(value.navigationRevision); });
  const handleSaved = () => { void refresh().then(refreshManifest); };
  useEffect(() => { void refresh(); }, []);
  return <div className={`${styles.navigationModule} module-page`}>
    <PageHeader eyebrow={t("webui.navigation.brand")} title={t("webui.navigation.menus.title")} description={t("webui.navigation.menus.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.navigation.menus.list.kicker")} title={t("webui.navigation.menus.list.title")}>
        <p className="revision">{t("webui.navigation.revision")}: <code>{revision.slice(0, 12)}</code></p>
        <div className="policy-grid">{items.map((item) => <MenuEditor key={`${item.id}-${item.version}`} item={item} items={items} onSaved={handleSaved} t={t} />)}</div>
      </PageSection>
    </div>
  </div>;
}

function MenuEditor({ item, items, onSaved, t }: { item: Menu; items: Menu[]; onSaved: () => void; t: (id: string) => string }) {
  const [enabled, setEnabled] = useState(item.enabled);
  const [parent, setParent] = useState(item.parentOverridden ? item.parentId : "__default");
  const [order, setOrder] = useState(item.orderOverridden ? String(item.order) : "");
  const title = (candidate: Menu) => candidate.moduleId === "navigation" ? t(candidate.titleMessageId) : candidate.titleMessageId;
  return <Surface className="policy-card"><header><div><h2>{title(item)}</h2><p>{item.id} · {item.moduleId}</p></div><StatusPill state={enabled ? "available" : "unavailable"}>{enabled ? t("webui.navigation.enabled") : t("webui.navigation.disabled")}</StatusPill></header><dl><div><dt>{t("webui.navigation.route")}</dt><dd>{item.routeId}</dd></div><div><dt>{t("webui.navigation.defaults")}</dt><dd>{item.defaultParentId || "—"} / {item.defaultOrder}</dd></div></dl><div className="policy-controls"><label><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />{t("webui.navigation.enabled")}</label><label>{t("webui.navigation.parent")}<select className="field-input" value={parent} onChange={(event) => setParent(event.target.value)}><option value="__default">{t("webui.navigation.useDefault")}</option><option value="">{t("webui.navigation.root")}</option>{items.filter((candidate) => candidate.id !== item.id).map((candidate) => <option value={candidate.id} key={candidate.id}>{title(candidate)}</option>)}</select></label><label>{t("webui.navigation.order")}<input type="number" className="field-input" value={order} placeholder={String(item.defaultOrder)} onChange={(event) => setOrder(event.target.value)} /></label><ActionTrigger operationId="navigation.menus.update" onAction={() => updateMenu(item, enabled, parent === "__default" ? undefined : parent, order === "" ? undefined : Number(order)).then(onSaved)}>{t("webui.navigation.save")}</ActionTrigger></div></Surface>;
}

export const effectivePolicy = (menu: Menu) => ({ enabled: menu.enabled, parent: menu.parentOverridden ? menu.parentId : menu.defaultParentId, order: menu.orderOverridden ? menu.order : menu.defaultOrder });