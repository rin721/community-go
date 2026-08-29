import { Moon, RotateCcw, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Drawer, SegmentedControl, SelectField, Switch, ToggleButton } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { dampingTiers, revealRhythmOptions, scrollbarStrategies, type ContentDensity, type ThemeMode, type ThemePreferences, type ThemePreset } from "../theme";

export type ThemePanel = "appearance" | "layout" | "general" | "preset" | "experience";
const panels: ThemePanel[] = ["appearance", "layout", "general", "experience", "preset"];
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

  return <Drawer open={open} onClose={onClose} title={t("webui.host.theme")} closeLabel={t("webui.host.theme.close")} className="theme-drawer" footer={<Button type="button" variant="secondary" onClick={onReset}><RotateCcw size={16} />{t("webui.host.theme.reset")}</Button>}>
    <SegmentedControl label={t("webui.host.theme.tabs")} value={panel} options={panels.map((value) => ({ value, label: panelLabel(value) }))} onValueChange={(value) => setPanel(value as ThemePanel)} className="theme-tabs" />
    <div className="drawer-content">
      {panel === "appearance" && <div id="theme-panel-appearance"><ThemeSection title={t("webui.host.theme.mode")}><div className="theme-choice-grid">{modes.map(({ value, icon: Icon, label }) => <ToggleButton key={value} selected={theme.mode === value} className="theme-choice" onChange={() => onChange({ ...theme, mode: value })}><Icon size={18} /><span>{t(label)}</span></ToggleButton>)}</div></ThemeSection><ThemeSection title={t("webui.host.theme.density")}><SegmentedControl label={t("webui.host.theme.density")} value={theme.density} options={densities.map((density) => ({ value: density, label: t(`webui.host.theme.${density}`) }))} onValueChange={(value) => onChange({ ...theme, density: value as ContentDensity })} /></ThemeSection></div>}
      {panel === "layout" && <div id="theme-panel-layout"><ThemeSection title={t("webui.host.theme.layout.title")}><p className="theme-section-description">{t("webui.host.theme.layout.detail")}</p><ThemeSwitch label={t("webui.host.theme.layout.breadcrumb")} checked={theme.layout.showBreadcrumb} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, showBreadcrumb: checked } })} /><ThemeSwitch label={t("webui.host.theme.layout.sidebarCollapsed")} checked={theme.layout.sidebarCollapsed} onChange={(checked) => onChange({ ...theme, layout: { ...theme.layout, sidebarCollapsed: checked } })} /></ThemeSection></div>}
      {panel === "general" && <div id="theme-panel-general"><ThemeSection title={t("webui.host.theme.general.title")}><p className="theme-section-description">{t("webui.host.theme.general.detail")}</p><ThemeSwitch label={t("webui.host.theme.general.reduceMotion")} checked={theme.reduceMotion} onChange={(checked) => onChange({ ...theme, reduceMotion: checked })} /></ThemeSection></div>}
      {panel === "experience" && <div id="theme-panel-experience"><ThemeSection title={t("webui.host.experience.title")}><p className="theme-section-description">{t("webui.host.experience.detail")}</p><ThemeSwitch label={t("webui.host.experience.smoothScroll")} checked={theme.experience.smoothScroll} onChange={(checked) => onChange({ ...theme, experience: { ...theme.experience, smoothScroll: checked } })} /><ThemeSwitch label={t("webui.host.experience.edgeDamping")} checked={theme.experience.edgeDamping} onChange={(checked) => onChange({ ...theme, experience: { ...theme.experience, edgeDamping: checked } })} /><ThemeSwitch label={t("webui.host.experience.magneticSnap")} checked={theme.experience.magneticSnap} onChange={(checked) => onChange({ ...theme, experience: { ...theme.experience, magneticSnap: checked } })} /><ThemeSwitch label={t("webui.host.experience.scrollHijack")} checked={theme.experience.scrollHijack} onChange={(checked) => onChange({ ...theme, experience: { ...theme.experience, scrollHijack: checked } })} /><ThemeSwitch label={t("webui.host.experience.reveal")} checked={theme.experience.reveal} onChange={(checked) => onChange({ ...theme, experience: { ...theme.experience, reveal: checked } })} /><ThemeSelect label={t("webui.host.experience.damping")} value={theme.experience.damping} options={dampingTiers} labelOf={(value) => t(`webui.host.experience.damping.${value}`)} onChange={(value) => onChange({ ...theme, experience: { ...theme.experience, damping: value } })} /><ThemeSelect label={t("webui.host.experience.revealRhythm")} value={theme.experience.revealRhythm} options={revealRhythmOptions} labelOf={(value) => t(`webui.host.experience.revealRhythm.${value}`)} onChange={(value) => onChange({ ...theme, experience: { ...theme.experience, revealRhythm: value } })} /><ThemeSelect label={t("webui.host.experience.scrollbar")} value={theme.experience.scrollbar} options={scrollbarStrategies} labelOf={(value) => t(`webui.host.experience.scrollbar.${value}`)} onChange={(value) => onChange({ ...theme, experience: { ...theme.experience, scrollbar: value } })} /></ThemeSection></div>}
      {panel === "preset" && <div id="theme-panel-preset"><ThemeSection title={t("webui.host.theme.primary")}><p className="theme-section-description">{t("webui.host.theme.preset.detail")}</p><div className="color-preset-grid">{presets.map((preset) => <ToggleButton key={preset} selected={theme.preset === preset} className={`color-preset ${preset}`} ariaLabel={t(`webui.host.theme.preset.${preset}`)} onChange={() => onChange({ ...theme, preset })}><span /></ToggleButton>)}</div></ThemeSection></div>}
    </div>
  </Drawer>;
}

export function themePanelTabID(panel: ThemePanel): string { return `webui-theme-tab-${panel}`; }
export function getThemePanelTargetIndex(key: string, currentIndex: number, count: number): number | undefined {
  if (count <= 0) return undefined;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return (currentIndex + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (currentIndex - 1 + count) % count;
  return undefined;
}
function ThemeSection({ title, children }: { title: string; children: ReactNode }) { return <section className="theme-section"><h3>{title}</h3>{children}</section>; }
function ThemeSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <div className="theme-switch-row"><span>{label}</span><Switch ariaLabel={label} checked={checked} onChange={onChange} /></div>; }
function ThemeSelect<T extends string>({ label, value, options, labelOf, onChange }: { label: string; value: T; options: ReadonlyArray<T>; labelOf: (value: T) => string; onChange: (value: T) => void }) { return <div className="theme-switch-row"><SelectField label={label} value={value} onValueChange={(next) => onChange(next as T)} options={options.map((option) => ({ value: option, label: labelOf(option) }))} className="w-44" /></div>; }
