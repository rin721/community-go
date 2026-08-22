import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { type ManifestRoute } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { translateMessage } from "../i18n";
import { motionDuration } from "../motion";
import { useOverlayOpenPhase } from "./shell/overlay";

export function RouteSearch({ open, routes, onClose }: { open: boolean; routes: ManifestRoute[]; onClose: () => void }) {
  const { i18n: hostI18n, t } = useWebUITranslation("webui.host");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const { phase, mounted } = useOverlayOpenPhase(open, motionDuration("standard"));

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(focusFrame);
      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      target?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
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

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])") ?? []);
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      : currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
    event.preventDefault();
    focusable[nextIndex]?.focus();
  };

  if (!mounted) return null;
  const overlayClass = phase === "exiting" ? "search-overlay exiting" : phase === "entering" ? "search-overlay entering" : "search-overlay open";
  return <div className={overlayClass} role="presentation" onMouseDown={onClose}>
    <section ref={dialogRef} className="route-search" role="dialog" aria-modal="true" aria-label={t("webui.host.search")} onKeyDown={handleDialogKeyDown} onMouseDown={(event) => event.stopPropagation()}>
      <div className="search-input-row">
        <Search size={19} aria-hidden="true" />
        <input ref={inputRef} autoFocus role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="webui-route-search-results" aria-activedescendant={results[selectedIndex] ? `webui-route-search-${results[selectedIndex].id}` : undefined} placeholder={t("webui.host.search.placeholder")} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={handleInputKeyDown} />
        <button type="button" className="icon-button" onClick={onClose} aria-label={t("webui.host.search.close")}><X size={17} /></button>
      </div>
      <div className="search-results" id="webui-route-search-results" role="listbox" aria-label={t("webui.host.search")}>
        {results.map((route, index) => <button type="button" id={`webui-route-search-${route.id}`} role="option" tabIndex={index === selectedIndex ? 0 : -1} aria-selected={index === selectedIndex} key={route.id} onMouseEnter={() => setSelectedIndex(index)} onClick={() => selectRoute(route)}><span><strong>{translateMessage(route.titleMessageId)}</strong><small>{route.path}</small></span><kbd aria-hidden="true">↵</kbd></button>)}
        {results.length === 0 && <p role="status">{t("webui.host.search.empty")}</p>}
      </div>
    </section>
  </div>;
}