import { useWebUITranslation } from "@webui/sdk/i18n";
import { ActionTrigger } from "@webui/sdk/ui";
import type { ZoneComponentProps } from "@webui/sdk/zone";

// HeaderAction is the Ops header-actions zone contribution: a quick entry to the
// capabilities page. It only consumes the SDK zone contract (contribution + navigate)
// and its own locale; it never reaches into host internals.
export default function HeaderAction({ contribution, navigate }: ZoneComponentProps) {
  const { t } = useWebUITranslation("webui.ops");
  return <ActionTrigger operationId="ops.diagnostics" variant="ghost" className="header-zone-action" aria-label={t(contribution.titleMessageId)} title={t(contribution.titleMessageId)} onAction={() => navigate("/dashboard/capabilities")}>{t(contribution.titleMessageId)}</ActionTrigger>;
}