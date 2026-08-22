import { useEffect, useState } from "react";
import { Button, Field, PageHeader, StatusPill, Surface } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { listAuditEvents, type AuditEventView, type AuditFilter } from "./api";
import styles from "./auth.module.css";

// outcomeTone maps audit outcomes to platform status tones: succeeded ->
// available, denied/failed -> degraded/unavailable.
export const outcomeTone = (outcome: AuditEventView["outcome"]): "available" | "degraded" | "unavailable" =>
  outcome === "succeeded" ? "available" : outcome === "denied" ? "degraded" : "unavailable";

export default function AuditPage() {
  const { t } = useWebUITranslation("webui.auth");
  const [items, setItems] = useState<AuditEventView[]>([]);
  const [total, setTotal] = useState(0);
  const [operation, setOperation] = useState("");
  const [outcome, setOutcome] = useState("");
  const refresh = (filter: AuditFilter) =>
    listAuditEvents(filter, 0, 100).then((result) => {
      setItems(result.items);
      setTotal(result.total);
    });
  useEffect(() => { void refresh({}); }, []);
  const applyFilter = () => {
    const filter: AuditFilter = {};
    if (operation) filter.operation = operation;
    if (outcome) filter.outcome = outcome as AuditFilter["outcome"];
    void refresh(filter);
  };
  return <div className={`${styles.authModule} module-page`}>
    <PageHeader eyebrow={t("webui.auth.audit.title")} title={t("webui.auth.audit.title")} description={t("webui.auth.audit.description")} />
    <Surface className="audit-toolbar">
      <Field label={t("webui.auth.audit.operation")} value={operation} onChange={(event) => setOperation(event.target.value)} />
      <Field label={t("webui.auth.audit.outcome")} value={outcome} onChange={(event) => setOutcome(event.target.value)} />
      <Button onClick={applyFilter}>{t("webui.auth.audit.refresh")}</Button>
    </Surface>
    <Surface className="audit-list">
      {items.length === 0
        ? <p className="audit-empty">{t("webui.auth.audit.empty")}</p>
        : <div className="audit-table-head"><span>{t("webui.auth.audit.occurredAt")}</span><span>{t("webui.auth.audit.operation")}</span><span>{t("webui.auth.audit.resourceType")}</span><span>{t("webui.auth.audit.resourceHash")}</span><span>{t("webui.auth.audit.subjectHash")}</span><span>{t("webui.auth.audit.outcome")}</span><span>{t("webui.auth.audit.decision")}</span></div>}
      {items.map((item, index) => <div className="audit-row" key={`${item.occurredAt}-${index}`}>
        <span className="audit-mono">{item.occurredAt}</span>
        <span className="audit-mono">{item.operation}</span>
        <span>{item.resourceType}</span>
        <span className="audit-mono">{item.resourceHash}</span>
        <span className="audit-mono">{item.subjectHash}</span>
        <span><StatusPill state={outcomeTone(item.outcome)}>{t(`webui.auth.audit.${item.outcome}`)}</StatusPill></span>
        <span className="audit-mono">{item.decision}</span>
      </div>)}
      <div className="audit-meta">total {total}</div>
    </Surface>
  </div>;
}