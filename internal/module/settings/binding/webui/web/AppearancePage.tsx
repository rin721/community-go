import type { ReactNode } from "react";
import { PageHeader, PageSection, SelectField, Switch } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import styles from "./settings.module.css";

// AppearancePage exposes theme and experience preferences. The host theme
// contract (theme.ts + ThemeDrawer) uses the localStorage key
// "community-go-webui-theme" and <html data-*> attributes; this page reads and
// writes the same contract without importing host internals, so the settings
// center and the drawer stay in sync.
type Experience = {
  smoothScroll: boolean;
  damping: "subtle" | "standard" | "relaxed";
  edgeDamping: boolean;
  magneticSnap: boolean;
  scrollHijack: boolean;
  reveal: boolean;
  revealRhythm: "calm" | "balanced" | "playful";
  scrollbar: "stable" | "overlay";
};
type ThemeValue = {
  mode: "system" | "light" | "dark";
  preset: "blue" | "cyan" | "green" | "violet" | "orange";
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  experience: Experience;
};

const storageKey = "community-go-webui-theme";

const defaultValue: ThemeValue = {
  mode: "system",
  preset: "blue",
  density: "comfortable",
  reduceMotion: false,
  experience: { smoothScroll: true, damping: "standard", edgeDamping: true, magneticSnap: true, scrollHijack: true, reveal: true, revealRhythm: "balanced", scrollbar: "stable" },
};

function readValue(): ThemeValue {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (value && typeof value === "object" && "mode" in (value as Record<string, unknown>) && "experience" in (value as Record<string, unknown>)) {
      return value as ThemeValue;
    }
  } catch {
    return defaultValue;
  }
  return defaultValue;
}

function applyValue(next: ThemeValue) {
  localStorage.setItem(storageKey, JSON.stringify(next));
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const colorScheme = next.mode === "system" ? (prefersDark ? "dark" : "light") : next.mode;
  root.dataset.colorScheme = colorScheme;
  root.classList.toggle("dark", colorScheme === "dark");
  root.dataset.themePreset = next.preset;
  root.dataset.density = next.density;
  const dataset = root.dataset as Record<string, string | undefined>;
  dataset.experienceSmoothScroll = String(next.experience.smoothScroll);
  dataset.experienceEdgeDamping = String(next.experience.edgeDamping);
  dataset.experienceReveal = String(next.experience.reveal);
  dataset.experienceDamping = next.experience.damping;
  dataset.experienceRevealRhythm = next.experience.revealRhythm;
  dataset.experienceScrollbar = next.experience.scrollbar;
}

const modes: Array<{ value: ThemeValue["mode"]; label: string }> = [
  { value: "light", label: "webui.settings.appearance.mode.light" },
  { value: "dark", label: "webui.settings.appearance.mode.dark" },
  { value: "system", label: "webui.settings.appearance.mode.system" },
];
const presets: Array<ThemeValue["preset"]> = ["blue", "cyan", "green", "violet", "orange"];
const densities: Array<ThemeValue["density"]> = ["comfortable", "compact"];

// settingRow is the "title left + control right" settings-row container that
// keeps the label/control association obvious.
function settingRow(title: string, control: ReactNode, hint?: string) {
  return <div className="setting-row"><div className="setting-row-label"><span className="setting-row-title">{title}</span>{hint && <p className="setting-row-hint">{hint}</p>}</div><div className="setting-row-control">{control}</div></div>;
}

export default function AppearancePage() {
  const { t } = useWebUITranslation("webui.settings");
  const value = readValue();
  const { experience } = value;
  const write = (next: ThemeValue) => applyValue(next);
  const withExperience = (patch: Partial<Experience>) => write({ ...value, experience: { ...experience, ...patch } });
  return <div className={`${styles.settingsModule} module-page`}>
    <PageHeader eyebrow={t("webui.settings.brand")} title={t("webui.settings.appearance.title")} description={t("webui.settings.appearance.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.settings.appearance.theme.kicker")} title={t("webui.settings.appearance.theme.title")}>
        <div className="settings-stack">
          {settingRow(t("webui.settings.appearance.mode"), <SelectField label={t("webui.settings.appearance.mode")} value={value.mode} onValueChange={(mode) => write({ ...value, mode: mode as ThemeValue["mode"] })} options={modes.map((option) => ({ value: option.value, label: t(option.label) }))} />)}
          {settingRow(t("webui.settings.appearance.preset"), <SelectField label={t("webui.settings.appearance.preset")} value={value.preset} onValueChange={(preset) => write({ ...value, preset: preset as ThemeValue["preset"] })} options={presets.map((preset) => ({ value: preset, label: t(`webui.settings.appearance.preset.${preset}`) }))} />)}
          {settingRow(t("webui.settings.appearance.density"), <SelectField label={t("webui.settings.appearance.density")} value={value.density} onValueChange={(density) => write({ ...value, density: density as ThemeValue["density"] })} options={densities.map((density) => ({ value: density, label: t(`webui.settings.appearance.density.${density}`) }))} />)}
          {settingRow(t("webui.settings.appearance.reduceMotion"), <Switch ariaLabel={t("webui.settings.appearance.reduceMotion")} checked={value.reduceMotion} onChange={(reduceMotion) => write({ ...value, reduceMotion })} />)}
        </div>
      </PageSection>
      <PageSection kicker={t("webui.settings.appearance.experience.kicker")} title={t("webui.settings.appearance.experience.title")}>
        <div className="settings-stack">
          {settingRow(t("webui.settings.appearance.smoothScroll"), <Switch ariaLabel={t("webui.settings.appearance.smoothScroll")} checked={experience.smoothScroll} onChange={(smoothScroll) => withExperience({ smoothScroll })} />)}
          {settingRow(t("webui.settings.appearance.edgeDamping"), <Switch ariaLabel={t("webui.settings.appearance.edgeDamping")} checked={experience.edgeDamping} onChange={(edgeDamping) => withExperience({ edgeDamping })} />)}
          {settingRow(t("webui.settings.appearance.reveal"), <Switch ariaLabel={t("webui.settings.appearance.reveal")} checked={experience.reveal} onChange={(reveal) => withExperience({ reveal })} />)}
          {settingRow(t("webui.settings.appearance.damping"), <SelectField label={t("webui.settings.appearance.damping")} value={experience.damping} onValueChange={(damping) => withExperience({ damping: damping as Experience["damping"] })} options={(["subtle", "standard", "relaxed"] as const).map((item) => ({ value: item, label: t(`webui.settings.appearance.damping.${item}`) }))} />)}
          {settingRow(t("webui.settings.appearance.revealRhythm"), <SelectField label={t("webui.settings.appearance.revealRhythm")} value={experience.revealRhythm} onValueChange={(revealRhythm) => withExperience({ revealRhythm: revealRhythm as Experience["revealRhythm"] })} options={(["calm", "balanced", "playful"] as const).map((item) => ({ value: item, label: t(`webui.settings.appearance.revealRhythm.${item}`) }))} />)}
          {settingRow(t("webui.settings.appearance.scrollbar"), <SelectField label={t("webui.settings.appearance.scrollbar")} value={experience.scrollbar} onValueChange={(scrollbar) => withExperience({ scrollbar: scrollbar as Experience["scrollbar"] })} options={(["stable", "overlay"] as const).map((item) => ({ value: item, label: t(`webui.settings.appearance.scrollbar.${item}`) }))} />)}
        </div>
      </PageSection>
    </div>
  </div>;
}