import { Moon, RotateCcw, Sun, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Button } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import type { ContentDensity, ThemeMode, ThemePreferences, ThemePreset } from "../theme";

export type ThemePanel = "appearance" | "layout" | "general" | "preset";

const panels: ThemePanel[] = ["appearance", "layout", "general", "preset"];
const modes: Array<{ value: ThemeMode; icon: typeof Sun; label: string }> = [
  { value: "light", icon: Sun, label: "webui.host.theme.light" },
  { value: "dark", icon: Moon, label: "webui.host.theme.dark" },
  { value: "system", icon: Sun, label: "webui.host.theme.system" },
];
const presets: ThemePreset[] = ["blue", "cyan", "green", "violet", "orange"];
const densities: ContentDensity[] = ["comfortable", "compact"];

export function ThemeDrawer({ open, theme, onChange, onReset, onClose }: { open: boolean; theme: ThemePreferences; onChange: (value: ThemePreferences) => void; onReset: () => void; onClose: () => void }) {
  const { t } = useWebUITranslation("webui.host");
  const [panel, setPanel] = useState<ThemePanel>("appearance");
  const drawerRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = requestAnimationFrame(() => drawerRef.current?.querySelector<HTMLElement>("[data-drawer-initial-focus]")?.focus());
    return () => {
      cancelAnimationFrame(focusFrame);
      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      target?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) setPanel("appearance");
  }, [open]);

  const panelLabel = (value: ThemePanel) => t(`webui.host.theme.tab.${value}`);
  const handleDrawerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])") ?? []);
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      : currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
    event.preventDefault();
    focusable[nextIndex]?.focus();
  };

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, current: ThemePanel) => {
    const currentIndex = panels.indexOf(current);
    const targetIndex = getThemePanelTargetIndex(event.key, currentIndex, panels.length);
    if (targetIndex === undefined) return;
    event.preventDefault();
    const target = panels[targetIndex];
    setPanel(target);
    requestAnimationFrame(() => document.getElementById(themePanelTabID(target))?.focus());
  };

  return <>
    <button type="button" aria-hidden={!open} aria-label={t("webui.host.theme.close")} className={`drawer-backdrop ${open ? "visible" : ""}`} disabled={!open} tabIndex={open ? 0 : -1} onClick={onClose} />
    <aside ref={drawerRef} className={`theme-drawer ${open ? "open" : ""}`} aria-hidden={!open} inert={!open} role="dialog" aria-modal="true" aria-labelledby="webui-theme-drawer-title" onKeyDown={handleDrawerKeyDown}>
      <div className="drawer-header"><div><span className="drawer-kicker">{t("webui.host.theme.appearance")}</span><h2 id="webui-theme-drawer-title">{t("webui.host.theme")}</h2></div><button type="button" data-drawer-initial-focus className="icon-button" onClick={onClose} aria-label={t("webui.host.theme.close")}><X size={18} /></button></div>
      <nav className="theme-tabs" role="tablist" aria-label={t("webui.host.theme.tabs")}>
        {panels.map((value) => <button id={themePanelTabID(value)} type="button" role="tab" tabIndex={panel === value ? 0 : -1} aria-selected={panel === value} aria-controls={`theme-panel-${value}`} className={panel === value ? "active" : ""} key={value} onClick={() => setPanel(value)} onKeyDown={(event) => handlePanelKeyDown(event, value)}>{panelLabel(value)}</button>)}
      </nav>
      <div className="drawer-content">
        {panel === "appearance" && <div id="theme-panel-appearance" role="tabpanel" aria-labelledby={themePanelTabID("appearance")}><ThemeSection title={t("webui.host.theme.mode")}><div className="theme-choice-grid">{modes.map(({ value, icon: Icon, label }) => <button type="button" key={value} aria-pressed={theme.mode === value} className={theme.mode === value ? "theme-choice selected" : "theme-choice"} onClick={() => onChange({ ...theme, mode: value })}><Icon size={18} /><span>{t(label)}</span></button>)}</div></ThemeSection><ThemeSection title={t("webui.host.theme.density")}><div className="segmented-control">{densities.map((density) => <button type="button" key={density} aria-pressed={theme.density === density} className={theme.density === density ? "active" : ""} onClick={() => onChange({ ...theme, density })}>{t(`webui.host.theme.${density}`)}</button>)}</div></ThemeSection></div>}
        {panel === "layout" && <div id="theme-panel-layout" role="tabpanel" aria-labelledby={themePanelTabID("layout")}><ThemeSection title={t("webui.host.theme.layout.title")}><p className="theme-section-description">{t("webui.host.theme.layout.detail")}</p><ThemeSwitch label={t("webui.host.theme.layout.breadcrumb")} checked={theme.layout.showBreadcrumb} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, showBreadcrumb: checked } })} /><ThemeSwitch label={t("webui.host.theme.layout.tabs")} checked={theme.layout.showTabs} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, showTabs: checked } })} /><ThemeSwitch label={t("webui.host.theme.layout.footer")} checked={theme.layout.showFooter} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, showFooter: checked } })} /><ThemeSwitch label={t("webui.host.theme.layout.sidebarCollapsed")} checked={theme.layout.sidebarCollapsed} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, sidebarCollapsed: checked } })} /></ThemeSection></div>}
        {panel === "general" && <div id="theme-panel-general" role="tabpanel" aria-labelledby={themePanelTabID("general")}><ThemeSection title={t("webui.host.theme.general.title")}><p className="theme-section-description">{t("webui.host.theme.general.detail")}</p><ThemeSwitch label={t("webui.host.theme.general.reduceMotion")} checked={theme.reduceMotion} onChange={(checked) => onChange({ ...theme, reduceMotion: checked })} /></ThemeSection></div>}
        {panel === "preset" && <div id="theme-panel-preset" role="tabpanel" aria-labelledby={themePanelTabID("preset")}><ThemeSection title={t("webui.host.theme.primary")}><p className="theme-section-description">{t("webui.host.theme.preset.detail")}</p><div className="color-preset-grid">{presets.map((preset) => <button type="button" key={preset} className={theme.preset === preset ? `color-preset ${preset} selected` : `color-preset ${preset}`} aria-label={t(`webui.host.theme.preset.${preset}`)} aria-pressed={theme.preset === preset} onClick={() => onChange({ ...theme, preset })}><span /></button>)}</div></ThemeSection></div>}
      </div>
      <div className="drawer-footer"><Button type="button" variant="secondary" onClick={onReset}><RotateCcw size={16} />{t("webui.host.theme.reset")}</Button></div>
    </aside>
  </>;
}

export function themePanelTabID(panel: ThemePanel): string {
  return `webui-theme-tab-${panel}`;
}

export function getThemePanelTargetIndex(key: string, currentIndex: number, count: number): number | undefined {
  if (count <= 0) return undefined;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return (currentIndex + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (currentIndex - 1 + count) % count;
  return undefined;
}

function ThemeSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="theme-section"><h3>{title}</h3>{children}</section>;
}

function ThemeSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="theme-switch-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
