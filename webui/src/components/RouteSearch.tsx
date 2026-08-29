import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type ManifestRoute } from "@webui/sdk/runtime";
import { CommandList, ModalDialog, SearchControl } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { translateMessage } from "../i18n";
import { buildRouteCommands, filterCommands, type CommandDefinition } from "../commands/registry";

/** RouteSearch 复用统一 SearchField + RAC ListBox，键盘游标、option 与 action 由组件栈承担。 */
export function RouteSearch({ open, routes, commands, onClose }: { open: boolean; routes: ManifestRoute[]; commands?: CommandDefinition[]; onClose: () => void }) {
  const { i18n: hostI18n, t } = useWebUITranslation("webui.host");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>();
  const navigate = useNavigate();
  const entries = useMemo(() => commands ?? buildRouteCommands(routes), [commands, routes]);
  const results = useMemo(() => filterCommands(entries, query, translateMessage), [entries, hostI18n.language, query]);

  useEffect(() => { if (open) setQuery(""); }, [open]);
  useEffect(() => { setSelectedKey(results[0]?.id); }, [results]);

  const selectCommand = (command: CommandDefinition) => {
    if (command.path) navigate(command.path);
    command.execute?.();
    onClose();
  };

  return <ModalDialog open={open} title={t("webui.host.search")} closeLabel={t("webui.host.search.close")} onClose={onClose} className="rac-search-panel">
    <div className="search-input-row"><SearchControl autoFocus label={t("webui.host.search")} placeholder={t("webui.host.search.placeholder")} value={query} onValueChange={setQuery} className="route-search-control" /></div>
    <CommandList
      label={t("webui.host.search")}
      className="search-results"
      selectedKey={selectedKey}
      onSelectionChange={setSelectedKey}
      onAction={(key) => { const command = results.find((entry) => entry.id === key); if (command) selectCommand(command); }}
      emptyState={<p role="status">{t("webui.host.search.empty")}</p>}
      items={results.map((command) => ({
        id: command.id,
        textValue: `${translateMessage(command.titleMessageId)} ${command.path ?? ""}`,
        data: { "data-command-kind": command.kind, "data-dangerous": command.dangerous ? "true" : undefined },
        label: <><span><strong>{translateMessage(command.titleMessageId)}</strong><small>{command.path ?? ""}</small></span><kbd aria-hidden="true">↵</kbd></>,
      }))}
    />
  </ModalDialog>;
}
