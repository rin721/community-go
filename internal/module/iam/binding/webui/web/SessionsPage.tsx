import { useCallback, useEffect, useState } from "react";
import { Button, PageHeader, PageSection, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { listSessions, revokeSessions, type SessionInfo } from "./api";
import styles from "./iam.module.css";

// toggleSelection returns an immutable copy of the selection with the id
// toggled; shared by the page render and unit tests.
export const toggleSelection = (current: Set<string>, id: string): Set<string> => {
  const next = new Set(current);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
};

export default function SessionsPage() {
  const { t } = useWebUITranslation("webui.iam");
  const [items, setItems] = useState<SessionInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const refresh = useCallback(() => {
    void listSessions().then((result) => { setItems(result.items); setSelected(new Set()); });
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const toggle = (idHash: string) => setSelected((current) => toggleSelection(current, idHash));
  const toggleAll = () => setSelected((current) => current.size === items.length ? new Set<string>() : new Set(items.map((item) => item.idHash)));
  const revoke = () => {
    if (selected.size === 0) return;
    void revokeSessions([...selected]).then(() => { setMessage(""); refresh(); }).catch(() => { setMessage(t("webui.iam.sessions.conflict")); refresh(); });
  };
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.access.title")} title={t("webui.iam.sessions.title")} description={t("webui.iam.sessions.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.sessions.list.kicker")} title={t("webui.iam.sessions.list.title")} actions={<div className="toolbar-actions"><Button variant="secondary" onClick={toggleAll}>{t("webui.iam.sessions.selectAll")}</Button><Button disabled={selected.size === 0} onClick={revoke}>{t("webui.iam.sessions.revoke")} ({selected.size})</Button></div>}>
        {message && <p className="page-meta">{message}</p>}
        {items.length === 0
          ? <p className="sessions-empty">{t("webui.iam.sessions.empty")}</p>
          : <>
              <div className="session-table-head"><span></span><span>{t("webui.iam.sessions.createdAt")}</span><span>{t("webui.iam.sessions.lastSeenAt")}</span><span>{t("webui.iam.sessions.idleExpiresAt")}</span><span>{t("webui.iam.sessions.absoluteExpiresAt")}</span><span>{t("webui.iam.sessions.revokedAt")}</span></div>
              <RevealSessions rows={items} selected={selected} toggle={toggle} t={t} />
            </>}
      </PageSection>
    </div>
  </div>;
}

function RevealSessions({ rows, selected, toggle, t }: { rows: SessionInfo[]; selected: Set<string>; toggle: (idHash: string) => void; t: (key: string) => string }) {
  return <>
    {rows.map((item) => <div className="session-row" key={item.idHash}>
      <input type="checkbox" checked={selected.has(item.idHash)} onChange={() => toggle(item.idHash)} aria-label={t("webui.iam.sessions.selectAll")} />
      <span className="session-mono">{item.createdAt}</span>
      <span className="session-mono">{item.lastSeenAt}</span>
      <span className="session-mono">{item.idleExpiresAt}</span>
      <span className="session-mono">{item.absoluteExpiresAt}</span>
      <span>{item.revokedAt ? <StatusPill state="unavailable">{t("webui.iam.sessions.revokedAt")}</StatusPill> : <StatusPill state="available">{t("webui.iam.sessions.active")}</StatusPill>}</span>
    </div>)}
  </>;
}