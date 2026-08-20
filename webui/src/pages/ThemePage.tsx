import { useState } from "react";

type Theme = { mode: "system" | "light" | "dark"; preset: "default" | "ocean" | "violet" | "graphite" };
const presets: Theme["preset"][] = ["default", "ocean", "violet", "graphite"];

export function ThemePage() {
  const [theme, setTheme] = useState<Theme>(() => { try { return JSON.parse(localStorage.getItem("community-go-admin-theme") ?? "null") ?? { mode: "dark", preset: "default" }; } catch { return { mode: "dark", preset: "default" }; } });
  const save = (value: Theme) => { setTheme(value); localStorage.setItem("community-go-admin-theme", JSON.stringify(value)); document.documentElement.dataset.theme = value.preset; };
  return <section className="page-card"><h1>外观</h1><p>主题设置只保存在浏览器，不与认证 Session 混储。</p><label>模式<select value={theme.mode} onChange={(event) => save({ ...theme, mode: event.target.value as Theme["mode"] })}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label><div className="preset-grid">{presets.map((preset) => <button className={theme.preset === preset ? "preset selected" : "preset"} key={preset} onClick={() => save({ ...theme, preset })}>{preset}</button>)}</div><div className="theme-actions"><button onClick={() => { const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "community-go-admin-theme.json"; link.click(); URL.revokeObjectURL(link.href); }}>导出</button><label className="file-button">导入<input type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; file.text().then((text) => { const value = JSON.parse(text) as Theme; if (!presets.includes(value.preset) || !["system", "light", "dark"].includes(value.mode)) throw new Error("invalid theme"); save(value); }).catch(() => undefined); }} /></label></div></section>;
}
