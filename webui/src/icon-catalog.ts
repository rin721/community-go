import { Activity, Bell, Briefcase, Building2, Check, ChevronRight, CircleUserRound, Info, KeyRound, Languages, LayoutDashboard, ListOrdered, Menu, Palette, Pencil, Plus, RefreshCw, RotateCcw, Search, Settings, ShieldCheck, SlidersHorizontal, Star, Trash2, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// iconCatalog 是 WebUI 受控 Lucide 图标目录的前端 authority：模块 Navigation/分区
// 注入点声明的 iconId 必须是该目录成员（Go 侧校验集合见 internal/webui/icons.go，
// 一致性由 internal/webui 图标目录测试守护，禁止任一侧私自增删）。
export const iconCatalog = {
  activity: Activity,
  bell: Bell,
  briefcase: Briefcase,
  building: Building2,
  check: Check,
  "chevron-right": ChevronRight,
  dashboard: LayoutDashboard,
  info: Info,
  key: KeyRound,
  languages: Languages,
  list: ListOrdered,
  menu: Menu,
  palette: Palette,
  pencil: Pencil,
  plus: Plus,
  refresh: RefreshCw,
  reset: RotateCcw,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  sliders: SlidersHorizontal,
  star: Star,
  trash: Trash2,
  user: CircleUserRound,
  users: Users,
  x: X,
} as const;

export type IconID = keyof typeof iconCatalog;

export const iconIDs = Object.keys(iconCatalog) as IconID[];

// iconComponent 按受控 iconId 返回 Lucide 图标组件；未知 id 返回 undefined，
// 由调用方决定回退表现（禁止在模块声明之外扩散任意图标字符串）。
export function iconComponent(iconID: string): LucideIcon | undefined {
  return (iconCatalog as Readonly<Record<string, LucideIcon>>)[iconID];
}