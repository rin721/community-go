import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { ManifestRoute } from "@webui/contracts";
import { translateMessage } from "../i18n";

export function RouteSearch({ open, routes, onClose }: { open: boolean; routes: ManifestRoute[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  useEffect(() => { if (open) { setQuery(""); setSelectedIndex(0); } }, [open]);
  const results = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    return routes.filter((route) => {
      const title = translateMessage(route.titleMessageId).toLocaleLowerCase();
      return !keyword || title.includes(keyword) || route.path.toLocaleLowerCase().includes(keyword);
    });
  }, [query, routes]);
  useEffect(() => { setSelectedIndex((current) => results.length === 0 ? 0 : Math.min(current, results.length - 1)); }, [results.length]);
  const selectRoute = (route: ManifestRoute) => { navigate(route.path); onClose(); };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { onClose(); return; }
    if (results.length === 0) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setSelectedIndex((current) => (current + 1) % results.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setSelectedIndex((current) => (current - 1 + results.length) % results.length); }
    if (event.key === "Enter") { event.preventDefault(); selectRoute(results[selectedIndex]); }
  };
  if (!open) return null;
  return <div className="search-overlay" role="presentation" onMouseDown={onClose}><section className="route-search" role="dialog" aria-modal="true" aria-label={translateMessage("webui.host.search")} onMouseDown={(event) => event.stopPropagation()}><div className="search-input-row"><Search size={19} /><input autoFocus placeholder={translateMessage("webui.host.search.placeholder")} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={handleKeyDown} aria-autocomplete="list" aria-controls="webui-route-search-results" aria-activedescendant={results[selectedIndex] ? `webui-route-search-${results[selectedIndex].id}` : undefined} /><button className="icon-button" onClick={onClose} aria-label={translateMessage("webui.host.search.close")}><X size={17} /></button></div><div className="search-results" id="webui-route-search-results" role="listbox">{results.map((route, index) => <button id={`webui-route-search-${route.id}`} role="option" aria-selected={index === selectedIndex} key={route.id} onMouseEnter={() => setSelectedIndex(index)} onClick={() => selectRoute(route)}><span><strong>{translateMessage(route.titleMessageId)}</strong><small>{route.path}</small></span><kbd>↵</kbd></button>)}{results.length === 0 && <p>{translateMessage("webui.host.search.empty")}</p>}</div></section></div>;
}
