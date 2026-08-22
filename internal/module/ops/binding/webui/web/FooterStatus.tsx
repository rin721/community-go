import { useEffect, useState } from "react";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { ActionTrigger, StatusPill } from "@webui/sdk/ui";
import type { ZoneComponentProps } from "@webui/sdk/zone";
import { resolveManagementSource, type ManagementSource } from "./environment";
import styles from "./ops.module.css";

// FooterStatus is the Ops footer-status zone contribution: it shows the management
// data-source reachability from a real probe (mock environment is decided by the
// declared data source). The retry action follows the unified interaction state chain
// (ActionTrigger with the action-permission hook).
export default function FooterStatus({ contribution }: ZoneComponentProps) {
  const { t } = useWebUITranslation("webui.ops");
  const [source, setSource] = useState<ManagementSource>();
  const [rechecking, setRechecking] = useState(false);
  useEffect(() => {
    let active = true;
    setRechecking(true);
    void resolveManagementSource().then((value) => { if (active) setSource(value); }).finally(() => { if (active) setRechecking(false); });
    return () => { active = false; };
  }, []);
  const tone = source === "connected" ? "available" : source === "mock" ? "degraded" : source === "unreachable" ? "unavailable" : "not-implemented";
  const label = tone === "available" ? t("webui.ops.footer.status.connected") : tone === "degraded" ? t("webui.ops.footer.status.mock") : tone === "unavailable" ? t("webui.ops.footer.status.unreachable") : t("webui.ops.footer.status.loading");
  return <span className={styles.footerStatus} title={t(contribution.titleMessageId)}><StatusPill state={tone}>{label}</StatusPill><ActionTrigger operationId="ops.diagnostics" variant="ghost" pending={rechecking} pendingLabel={t("webui.ops.footer.status.loading")} aria-label={t("webui.ops.footer.status.retry")} title={t("webui.ops.footer.status.retry")} onAction={() => { setRechecking(true); void resolveManagementSource().then(setSource).finally(() => setRechecking(false)); }}>{t("webui.ops.footer.status.retry")}</ActionTrigger></span>;
}