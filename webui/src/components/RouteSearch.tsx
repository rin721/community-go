import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog as RACDialog, Modal as RACModal } from "react-aria-components";
import { type ManifestRoute } from "@webui/sdk/runtime";
import { IconButton } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { translateMessage } from "../i18n";
import { buildRouteCommands, filterCommands, type CommandDefinition } from "../commands/registry";

// RouteSearch 迁到 RAC 受控 Modal+Dialog（069）：搜索输入、option 导航与
// aria-activedescendant 语义保持；焦点/Escape/恢复由 react-aria 承担。
export function RouteSearch({ open, routes, commands, onClose }: { open: boolean; routes: ManifestRoute[]; commands?: CommandDefinition[]; onClose: () => void }) {
  const { i18n: hostI18n, t } = useWebUITranslation("webui.host");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      const focusFrame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(focusFrame);
    }
  }, [open]);

  const entries = useMemo(() => commands ?? buildRouteCommands(routes), [commands, routes]);
  const results = useMemo(() => filterCommands(entries, query, translateMessage), [entries, hostI18n.language, query]);

  useEffect(() => {
    setSelectedIndex((current) => results.length === 0 ? 0 : Math.min(current, results.length - 1));
  }, [results.length]);

  const selectCommand = (command: CommandDefinition) => {
    if (command.path) navigate(command.path);
    command.execute?.();
    onClose();
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + results.length) % results.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectCommand(results[selectedIndex]);
    }
  };

  return (
    <RACModal isOpen={open} onOpenChange={(next) => { if (!next) onClose(); }} isDismissable className="rac-modal-backdrop rac-modal-backdrop-search">
      <RACDialog aria-label={t("webui.host.search")} className="rac-search-panel">
        <div className="search-input-row">
          <Search size={19} aria-hidden="true" />
          <input ref={inputRef} role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="webui-route-search-results" aria-activedescendant={results[selectedIndex] ? `webui-route-search-${commandDOMID(results[selectedIndex])}` : undefined} placeholder={t("webui.host.search.placeholder")} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={handleInputKeyDown} />
          <IconButton label={t("webui.host.search.close")} onClick={onClose}><X size={17} /></IconButton>
        </div>
        <div className="search-results" id="webui-route-search-results" role="listbox" aria-label={t("webui.host.search")}>
          {results.map((command, index) => <button type="button" id={`webui-route-search-${commandDOMID(command)}`} role="option" data-command-kind={command.kind} data-dangerous={command.dangerous ? "true" : undefined} tabIndex={index === selectedIndex ? 0 : -1} aria-selected={index === selectedIndex} key={command.id} onMouseEnter={() => setSelectedIndex(index)} onClick={() => selectCommand(command)}><span><strong>{translateMessage(command.titleMessageId)}</strong><small>{command.path ?? ""}</small></span><kbd aria-hidden="true">↵</kbd></button>)}
          {results.length === 0 && <p role="status">{t("webui.host.search.empty")}</p>}
        </div>
      </RACDialog>
    </RACModal>
  );
}

function commandDOMID(command: CommandDefinition): string {
  const raw = command.kind === "route" && command.id.startsWith("route:") ? command.id.slice("route:".length) : command.id;
  return raw.replace(/[^a-z0-9_-]/gi, "-");
}
