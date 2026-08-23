import { useCallback, useEffect, useState } from "react";
import { ActionTrigger, Field, InlineAlert, PageHeader, PageSection, RevealList, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { createPosition, listPositions, updatePosition, type Position } from "./api";
import styles from "./organization.module.css";

export default function PositionsPage() {
  const { t } = useWebUITranslation("webui.organization");
  const [items, setItems] = useState<Position[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(() => listPositions().then(setItems).catch(() => setError(t("webui.organization.error"))), [t]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <div className={`${styles.organizationModule} module-page`}>
    <PageHeader eyebrow={t("webui.organization.brand")} title={t("webui.organization.positions.title")} description={t("webui.organization.positions.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.organization.positions.create.kicker")} title={t("webui.organization.positions.create.title")}>
        <div className="toolbar">
          <Field label={t("webui.organization.code")} value={code} onChange={(event) => setCode(event.target.value)} />
          <Field label={t("webui.organization.name")} value={name} onChange={(event) => setName(event.target.value)} />
          <ActionTrigger operationId="organization.positions.create" onAction={() => createPosition(code, name).then(() => { setCode(""); setName(""); setError(""); return refresh(); }).catch(() => setError(t("webui.organization.error")))}>{t("webui.organization.create")}</ActionTrigger>
        </div>
      </PageSection>
      <PageSection kicker={t("webui.organization.positions.list.kicker")} title={t("webui.organization.positions.list.title")}>
        {error && <InlineAlert tone="danger" title={error} />}
        <RevealList className="card-grid">
          {items.map((item) => <div className="item-card" key={item.id}><div><h3>{item.name}</h3><p>{item.code}</p></div><div className="item-card-meta"><StatusPill state={item.active && !item.archived ? "available" : "unavailable"}>{item.archived ? t("webui.organization.archived") : t("webui.organization.active")}</StatusPill><ActionTrigger operationId="organization.positions.update" variant="secondary" onAction={() => updatePosition(item, { archived: !item.archived }).then(refresh).catch(() => setError(t("webui.organization.error")))}>{item.archived ? t("webui.organization.restore") : t("webui.organization.archive")}</ActionTrigger></div></div>)}
        </RevealList>
      </PageSection>
    </div>
  </div>;
}