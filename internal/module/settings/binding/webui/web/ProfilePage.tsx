import { useEffect, useState } from "react";
import { Button, Field, PageHeader, PageSection, StatusPill, StickyActionBar } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { loadSession, updateSelfProfile } from "./api";
import styles from "./settings.module.css";

// ProfilePage edits the user-home profile (nickname/bio/birth date, 072) through
// the IAM self-service profile endpoint with an optimistic lock.
export default function ProfilePage() {
  const { t } = useWebUITranslation("webui.settings");
  const [identity, setIdentity] = useState<Awaited<ReturnType<typeof loadSession>>["identity"]>();
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => { void loadSession().then((session) => { setIdentity(session.identity); setNickname(session.identity.nickname ?? ""); setBio(session.identity.bio ?? ""); setBirthDate(session.identity.birthDate ?? ""); setVersion(0); }).catch(() => undefined); }, []);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const expected = version === 0 && identity ? 0 : version;
    updateSelfProfile({ nickname, bio, birthDate }, expected).then((value) => { setVersion(value.version); setMessage(t("webui.settings.profile.saved")); }).catch((error: unknown) => {
      const status = (error as { status?: number })?.status;
      setMessage(status === 409 ? t("webui.settings.profile.conflict") : t("webui.settings.error"));
    });
  };
  return <>
    
      <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.profile.title")} description={t("webui.settings.profile.description")} actions={identity?.mustChangePassword ? <StatusPill state="degraded">{t("webui.settings.profile.changeRequired")}</StatusPill> : undefined} />
      <div className="page-sections">
        <PageSection kicker={t("webui.settings.profile.form.kicker")} title={t("webui.settings.profile.form.title")}>
          <form className="form-panel" onSubmit={submit}>
            <Field label={t("webui.settings.profile.username")} value={identity?.username ?? ""} disabled />
            <Field label={t("webui.settings.profile.nickname")} maxLength={64} value={nickname} onChange={(event) => setNickname(event.target.value)} />
            <Field label={t("webui.settings.profile.bio")} type={undefined} maxLength={2048} value={bio} onChange={(event) => setBio(event.target.value)} placeholder={t("webui.settings.profile.bioPlaceholder")} />
            <Field label={t("webui.settings.profile.birthDate")} type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
            {message && <p className="page-meta" role="status">{message}</p>}
            <StickyActionBar><Button type="submit">{t("webui.settings.profile.save")}</Button></StickyActionBar>
          </form>
        </PageSection>
      </div>
    
  </>;
}
