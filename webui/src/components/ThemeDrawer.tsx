import { Moon, RotateCcw, Sun, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@webui/ui";
import { useWebUITranslation } from "@webui/contracts";
import type { ContentDensity, ThemeMode, ThemePreferences, ThemePreset } from "../theme";

type ThemePanel = "appearance" | "layout" | "general" | "preset";

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
  useEffect(() => { if (open) setPanel("appearance"); }, [open]);
  const panelLabel = (value: ThemePanel) => t(`webui.host.theme.tab.${value}`);
  return <><button aria-label={t("webui.host.theme.close")} className={`drawer-backdrop ${open ? "visible" : ""}`} onClick={onClose} /><aside className={`theme-drawer ${open ? "open" : ""}`} aria-hidden={!open} role="dialog" aria-modal="true"><div className="drawer-header"><div><span className="drawer-kicker">{t("webui.host.theme.appearance")}</span><h2>{t("webui.host.theme")}</h2></div><button className="icon-button" onClick={onClose} aria-label={t("webui.host.theme.close")}><X size={18} /></button></div><nav className="theme-tabs" role="tablist" aria-label={t("webui.host.theme.tabs")}>
    {panels.map((value) => <button type="button" role="tab" aria-selected={panel === value} aria-controls={`theme-panel-${value}`} className={panel === value ? "active" : ""} key={value} onClick={() => setPanel(value)}>{panelLabel(value)}</button>)}
  </nav><div className="drawer-content">{panel === "appearance" && <div id="theme-panel-appearance" role="tabpanel"><ThemeSection title={t("webui.host.theme.mode")}><div className="theme-choice-grid">{modes.map(({ value, icon: Icon, label }) => <button type="button" key={value} className={theme.mode === value ? "theme-choice selected" : "theme-choice"} onClick={() => onChange({ ...theme, mode: value })}><Icon size={18} /><span>{t(label)}</span></button>)}</div></ThemeSection><ThemeSection title={t("webui.host.theme.density")}><div className="segmented-control">{densities.map((density) => <button type="button" key={density} className={theme.density === density ? "active" : ""} onClick={() => onChange({ ...theme, density })}>{t(`webui.host.theme.${density}`)}</button>)}</div></ThemeSection></div>}{panel === "layout" && <div id="theme-panel-layout" role="tabpanel"><ThemeSection title={t("webui.host.theme.layout.title")}><p className="theme-section-description">{t("webui.host.theme.layout.detail")}</p><ThemeSwitch label={t("webui.host.theme.layout.breadcrumb")} checked={theme.layout.showBreadcrumb} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, showBreadcrumb: checked } })} /><ThemeSwitch label={t("webui.host.theme.layout.tabs")} checked={theme.layout.showTabs} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, showTabs: checked } })} /><ThemeSwitch label={t("webui.host.theme.layout.footer")} checked={theme.layout.showFooter} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, showFooter: checked } })} /><ThemeSwitch label={t("webui.host.theme.layout.sidebarCollapsed")} checked={theme.layout.sidebarCollapsed} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, sidebarCollapsed: checked } })} /></ThemeSection></div>}{panel === "general" && <div id="theme-panel-general" role="tabpanel"><ThemeSection title={t("webui.host.theme.general.title")}><p className="theme-section-description">{t("webui.host.theme.general.detail")}</p><ThemeSwitch label={t("webui.host.theme.general.reduceMotion")} checked={theme.reduceMotion} onChange={(checked) => onChange({ ...theme, reduceMotion: checked })} /></ThemeSection></div>}{panel === "preset" && <div id="theme-panel-preset" role="tabpanel"><ThemeSection title={t("webui.host.theme.primary")}><p className="theme-section-description">{t("webui.host.theme.preset.detail")}</p><div className="color-preset-grid">{presets.map((preset) => <button type="button" key={preset} className={theme.preset === preset ? `color-preset ${preset} selected` : `color-preset ${preset}`} aria-label={t(`webui.host.theme.preset.${preset}`)} onClick={() => onChange({ ...theme, preset })}><span /></button>)}</div></ThemeSection></div>}</div><div className="drawer-footer"><Button variant="secondary" onClick={onReset}><RotateCcw size={16} />{t("webui.host.theme.reset")}</Button></div></aside></>;
}

function ThemeSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="theme-section"><h3>{title}</h3>{children}</section>;
}

function ThemeSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="theme-switch-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
