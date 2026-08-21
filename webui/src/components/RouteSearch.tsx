import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ManifestRoute } from "@webui/contracts";
import { translateMessage } from "../i18n";

export function RouteSearch({ open, routes, onClose }: { open: boolean; routes: ManifestRoute[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => { if (open) setQuery(""); }, [open]);
  const results = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    return routes.filter((route) => {
      const title = translateMessage(route.titleMessageId).toLocaleLowerCase();
      return !keyword || title.includes(keyword) || route.path.toLocaleLowerCase().includes(keyword);
    });
  }, [query, routes]);
  if (!open) return null;
  return <div className="search-overlay" role="presentation" onMouseDown={onClose}><section className="route-search" role="dialog" aria-modal="true" aria-label={translateMessage("webui.host.search")} onMouseDown={(event) => event.stopPropagation()}><div className="search-input-row"><Search size={19} /><input autoFocus placeholder={translateMessage("webui.host.search.placeholder")} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Escape" && onClose()} /><button className="icon-button" onClick={onClose}><X size={17} /></button></div><div className="search-results">{results.map((route) => <button key={route.id} onClick={() => { navigate(route.path); onClose(); }}><span><strong>{translateMessage(route.titleMessageId)}</strong><small>{route.path}</small></span><kbd>↵</kbd></button>)}{results.length === 0 && <p>{translateMessage("webui.host.search.empty")}</p>}</div></section></div>;
}
