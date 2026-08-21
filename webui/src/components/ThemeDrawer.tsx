import { Moon, RotateCcw, Sun, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@webui/ui";
import { translateMessage } from "../i18n";
import type { ContentDensity, ThemeMode, ThemePreferences, ThemePreset } from "../theme";

const modes: Array<{ value: ThemeMode; icon: typeof Sun; label: string }> = [
  { value: "light", icon: Sun, label: "webui.host.theme.light" },
  { value: "dark", icon: Moon, label: "webui.host.theme.dark" },
  { value: "system", icon: Sun, label: "webui.host.theme.system" },
];
const presets: ThemePreset[] = ["blue", "cyan", "green", "violet", "orange"];
const densities: ContentDensity[] = ["comfortable", "compact"];

export function ThemeDrawer({ open, theme, onChange, onReset, onClose }: { open: boolean; theme: ThemePreferences; onChange: (value: ThemePreferences) => void; onReset: () => void; onClose: () => void }) {
  return <><button aria-label={translateMessage("webui.host.theme.close")} className={`drawer-backdrop ${open ? "visible" : ""}`} onClick={onClose} /><aside className={`theme-drawer ${open ? "open" : ""}`} aria-hidden={!open}><div className="drawer-header"><div><span className="drawer-kicker">{translateMessage("webui.host.theme.appearance")}</span><h2>{translateMessage("webui.host.theme")}</h2></div><button className="icon-button" onClick={onClose} aria-label={translateMessage("webui.host.theme.close")}><X size={18} /></button></div><div className="drawer-content"><ThemeSection title={translateMessage("webui.host.theme.mode")}><div className="theme-choice-grid">{modes.map(({ value, icon: Icon, label }) => <button key={value} className={theme.mode === value ? "theme-choice selected" : "theme-choice"} onClick={() => onChange({ ...theme, mode: value })}><Icon size={18} /><span>{translateMessage(label)}</span></button>)}</div></ThemeSection><ThemeSection title={translateMessage("webui.host.theme.primary")}><div className="color-preset-grid">{presets.map((preset) => <button key={preset} className={theme.preset === preset ? `color-preset ${preset} selected` : `color-preset ${preset}`} aria-label={translateMessage(`webui.host.theme.preset.${preset}`)} onClick={() => onChange({ ...theme, preset })}><span /></button>)}</div></ThemeSection><ThemeSection title={translateMessage("webui.host.theme.density")}><div className="segmented-control">{densities.map((density) => <button key={density} className={theme.density === density ? "active" : ""} onClick={() => onChange({ ...theme, density })}>{translateMessage(`webui.host.theme.${density}`)}</button>)}</div></ThemeSection></div><div className="drawer-footer"><Button variant="secondary" onClick={onReset}><RotateCcw size={16} />{translateMessage("webui.host.theme.reset")}</Button></div></aside></>;
}

function ThemeSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="theme-section"><h3>{title}</h3>{children}</section>;
}
