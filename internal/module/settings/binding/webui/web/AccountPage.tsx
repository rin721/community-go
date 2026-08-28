import { useEffect, useState } from "react";
import { Button, ConfirmDialog, PageFrame, PageHeader, PageSection } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { beginSelfArchive, confirmSelfArchive, loadSession } from "./api";
import styles from "./settings.module.css";

// AccountPage shows the username (read-only) and provides the two-step soft
// account closure (072): the first call returns a confirmation id, the dialog
// confirm performs the archive (login blocked, sessions revoked).
export default function AccountPage() {
  const { t } = useWebUITranslation("webui.settings");
  const [username, setUsername] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  useEffect(() => { void loadSession().then((session) => { setUsername(session.identity.username); setProfileSaved(session.identity.username !== ""); }).catch(() => undefined); }, []);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmationId, setConfirmationId] = useState("");
  const [message, setMessage] = useState("");
  const requestClosure = () => {
    setMessage("");
    beginSelfArchive().then(({ confirmationId: id }) => { setConfirmationId(id); setConfirmOpen(true); }).catch(() => setMessage(t("webui.settings.error")));
  };
  const performClosure = () => {
    void confirmSelfArchive(confirmationId).then(() => { window.location.href = "/login"; }).catch(() => setMessage(t("webui.settings.error")));
  };
  return <PageFrame variant="form" className={styles.settingsModule}>
    
      <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.account.title")} description={t("webui.settings.account.description")} />
      <div className="page-sections">
        <PageSection kicker={t("webui.settings.account.identity.kicker")} title={t("webui.settings.account.identity.title")}>
          <dl className="settings-summary"><div><dt>{t("webui.settings.account.username")}</dt><dd>@{username}</dd></div></dl>
          {!profileSaved && <p className="page-meta">{t("webui.settings.account.loading")}</p>}
        </PageSection>
        <PageSection kicker={t("webui.settings.account.closure.kicker")} title={t("webui.settings.account.closure.title")}>
          <p className="page-meta">{t("webui.settings.account.closure.detail")}</p>
          {message && <p className="page-meta" role="status">{message}</p>}
          <div className="toolbar-actions"><Button type="button" variant="danger" onClick={requestClosure}>{t("webui.settings.account.closure.begin")}</Button></div>
        </PageSection>
      </div>
    
    <ConfirmDialog open={confirmOpen} title={t("webui.settings.account.closure.confirmTitle")} description={t("webui.settings.account.closure.confirmDetail")} confirmLabel={t("webui.settings.account.closure.confirm")} cancelLabel={t("webui.settings.account.closure.cancel")} closeLabel={t("webui.settings.account.closure.close")} onConfirm={performClosure} onCancel={() => setConfirmOpen(false)} />
  </PageFrame>;
}
