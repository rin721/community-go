import { useHostRuntime, useWebUITranslation } from "@webui/contracts";
import { PageHeader, Surface } from "@webui/ui";

export default function SessionPage() {
  const { t } = useWebUITranslation("webui.auth");
  const { session } = useHostRuntime();
  return <div className="module-page"><PageHeader eyebrow={t("webui.auth.session.eyebrow")} title={t("webui.auth.session.title")} description={t("webui.auth.session.description")} /><Surface>{session ? <dl className="detail-list"><dt>{t("webui.auth.session.user")}</dt><dd>{session.user.username}</dd><dt>{t("webui.auth.session.idleExpiresAt")}</dt><dd>{session.idleExpiresAt}</dd><dt>{t("webui.auth.session.absoluteExpiresAt")}</dt><dd>{session.absoluteExpiresAt}</dd></dl> : <p className="empty-state">{t("webui.auth.session.unauthenticated")}</p>}</Surface></div>;
}
