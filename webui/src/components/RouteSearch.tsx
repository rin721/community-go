import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog as RACDialog, Modal as RACModal } from "react-aria-components";
import { type ManifestRoute } from "@webui/sdk/runtime";
import { IconButton } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { translateMessage } from "../i18n";

// RouteSearch 迁到 RAC 受控 Modal+Dialog（069）：搜索输入、option 导航与
// aria-activedescendant 语义保持；焦点/Escape/恢复由 react-aria 承担。
export function RouteSearch({ open, routes, onClose }: { open: boolean; routes: ManifestRoute[]; onClose: () => void }) {
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

  const results = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    return routes.filter((route) => {
      const title = translateMessage(route.titleMessageId).toLocaleLowerCase();
      return !keyword || title.includes(keyword) || route.path.toLocaleLowerCase().includes(keyword);
    });
  }, [hostI18n.language, query, routes]);

  useEffect(() => {
    setSelectedIndex((current) => results.length === 0 ? 0 : Math.min(current, results.length - 1));
  }, [results.length]);

  const selectRoute = (route: ManifestRoute) => {
    navigate(route.path);
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
      selectRoute(results[selectedIndex]);
    }
  };

  return (
    <RACModal isOpen={open} onOpenChange={(next) => { if (!next) onClose(); }} isDismissable className="rac-modal-backdrop rac-modal-backdrop-search">
      <RACDialog aria-label={t("webui.host.search")} className="rac-search-panel">
        <div className="search-input-row">
          <Search size={19} aria-hidden="true" />
          <input ref={inputRef} role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="webui-route-search-results" aria-activedescendant={results[selectedIndex] ? `webui-route-search-${results[selectedIndex].id}` : undefined} placeholder={t("webui.host.search.placeholder")} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={handleInputKeyDown} />
          <IconButton label={t("webui.host.search.close")} onClick={onClose}><X size={17} /></IconButton>
        </div>
        <div className="search-results" id="webui-route-search-results" role="listbox" aria-label={t("webui.host.search")}>
          {results.map((route, index) => <button type="button" id={`webui-route-search-${route.id}`} role="option" tabIndex={index === selectedIndex ? 0 : -1} aria-selected={index === selectedIndex} key={route.id} onMouseEnter={() => setSelectedIndex(index)} onClick={() => selectRoute(route)}><span><strong>{translateMessage(route.titleMessageId)}</strong><small>{route.path}</small></span><kbd aria-hidden="true">↵</kbd></button>)}
          {results.length === 0 && <p role="status">{t("webui.host.search.empty")}</p>}
        </div>
      </RACDialog>
    </RACModal>
  );
}