import {
  BookOpenText,
  Building2,
  Bug,
  ClipboardCheck,
  Code2,
  FileVideo,
  Flag,
  HeartPulse,
  History,
  ImageUp,
  KeyRound,
  LayoutDashboard,
  ListTree,
  LockKeyhole,
  LogIn,
  Megaphone,
  MonitorCheck,
  PackageCheck,
  Palette,
  PanelLeft,
  ScrollText,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { SystemMenuGroup, SystemMenuItem } from "~/lib/api/types";

type AdminNavGroupId =
  | "workspace"
  | "identity"
  | "community"
  | "system"
  | "logs"
  | "media"
  | "integration";

export type AdminNavItem = {
  end?: boolean;
  icon: LucideIcon;
  id: string;
  label?: string;
  labelKey: string;
  to: string;
};

export type AdminNavGroup = {
  icon: LucideIcon;
  id: AdminNavGroupId;
  items: AdminNavItem[];
  label?: string;
  labelKey: string;
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    icon: LayoutDashboard,
    id: "workspace",
    items: [
      {
        end: true,
        icon: LayoutDashboard,
        id: "dashboard",
        labelKey: "admin.nav.dashboard",
        to: "/admin",
      },
      {
        icon: Megaphone,
        id: "announcements",
        labelKey: "admin.nav.announcements",
        to: "/admin/announcements",
      },
    ],
    labelKey: "admin.navGroups.workspace",
  },
  {
    icon: ShieldCheck,
    id: "identity",
    items: [
      { icon: ShieldCheck, id: "iam", labelKey: "admin.nav.iam", to: "/admin/iam" },
      {
        icon: Building2,
        id: "organizations",
        labelKey: "admin.nav.organizations",
        to: "/admin/organizations",
      },
      { icon: Users, id: "users", labelKey: "admin.nav.users", to: "/admin/users" },
      { icon: Shield, id: "roles", labelKey: "admin.nav.roles", to: "/admin/roles" },
      {
        icon: MonitorCheck,
        id: "sessions",
        labelKey: "admin.nav.sessions",
        to: "/admin/sessions",
      },
      {
        icon: LockKeyhole,
        id: "security",
        labelKey: "admin.nav.security",
        to: "/admin/security",
      },
      {
        icon: ShieldAlert,
        id: "traffic-hijack",
        labelKey: "admin.nav.trafficHijack",
        to: "/admin/traffic-hijack",
      },
      {
        icon: KeyRound,
        id: "api-tokens",
        labelKey: "admin.nav.apiTokens",
        to: "/admin/api-tokens",
      },
    ],
    labelKey: "admin.navGroups.identity",
  },
  {
    icon: UsersRound,
    id: "community",
    items: [
      {
        end: true,
        icon: LayoutDashboard,
        id: "community-overview",
        labelKey: "admin.nav.communityOverview",
        to: "/admin/community",
      },
      {
        icon: UsersRound,
        id: "community-accounts",
        labelKey: "admin.nav.communityAccounts",
        to: "/admin/community/accounts",
      },
      {
        icon: ClipboardCheck,
        id: "community-submissions",
        labelKey: "admin.nav.communitySubmissions",
        to: "/admin/community/submissions",
      },
      {
        icon: ListTree,
        id: "community-categories",
        labelKey: "admin.nav.communityCategories",
        to: "/admin/community/categories",
      },
      {
        icon: Flag,
        id: "community-reports",
        labelKey: "admin.nav.communityReports",
        to: "/admin/community/reports",
      },
      {
        icon: FileVideo,
        id: "community-video-jobs",
        labelKey: "admin.nav.communityVideoJobs",
        to: "/admin/community/video-jobs",
      },
    ],
    labelKey: "admin.navGroups.community",
  },
  {
    icon: Settings,
    id: "system",
    items: [
      { icon: HeartPulse, id: "probes", labelKey: "admin.nav.probes", to: "/admin/probes" },
      { icon: PanelLeft, id: "menus", labelKey: "admin.nav.menus", to: "/admin/menus" },
      {
        icon: BookOpenText,
        id: "dictionaries",
        labelKey: "admin.nav.dictionaries",
        to: "/admin/dictionaries",
      },
      { icon: Settings, id: "system", labelKey: "admin.nav.system", to: "/admin/system" },
      {
        icon: Palette,
        id: "design-system",
        labelKey: "admin.nav.designSystem",
        to: "/admin/design-system",
      },
      {
        icon: SlidersHorizontal,
        id: "parameters",
        labelKey: "admin.nav.parameters",
        to: "/admin/parameters",
      },
    ],
    labelKey: "admin.navGroups.system",
  },
  {
    icon: ScrollText,
    id: "logs",
    items: [
      {
        icon: History,
        id: "operation-records",
        labelKey: "admin.nav.operationRecords",
        to: "/admin/operation-records",
      },
      {
        icon: ScrollText,
        id: "audit-logs",
        labelKey: "admin.nav.auditLogs",
        to: "/admin/audit-logs",
      },
      { icon: LogIn, id: "login-logs", labelKey: "admin.nav.loginLogs", to: "/admin/login-logs" },
      { icon: Bug, id: "error-logs", labelKey: "admin.nav.errorLogs", to: "/admin/error-logs" },
      {
        icon: Send,
        id: "notification-outbox",
        labelKey: "admin.nav.notificationOutbox",
        to: "/admin/notification-outbox",
      },
    ],
    labelKey: "admin.navGroups.logs",
  },
  {
    icon: ImageUp,
    id: "media",
    items: [
      {
        end: true,
        icon: ImageUp,
        id: "media",
        labelKey: "admin.nav.media",
        to: "/admin/media",
      },
      {
        icon: ImageUp,
        id: "media-resumable",
        labelKey: "admin.nav.mediaResumable",
        to: "/admin/media/resumable",
      },
    ],
    labelKey: "admin.navGroups.media",
  },
  {
    icon: Code2,
    id: "integration",
    items: [
      { icon: Code2, id: "apis", labelKey: "admin.nav.apis", to: "/admin/apis" },
      {
        icon: PackageCheck,
        id: "versions",
        labelKey: "admin.nav.versions",
        to: "/admin/versions",
      },
    ],
    labelKey: "admin.navGroups.integration",
  },
];

export const minimalAdminNavGroups: AdminNavGroup[] = [
  {
    icon: LayoutDashboard,
    id: "workspace",
    items: [
      {
        end: true,
        icon: LayoutDashboard,
        id: "dashboard",
        labelKey: "admin.nav.dashboard",
        to: "/admin",
      },
    ],
    labelKey: "admin.navGroups.workspace",
  },
];

const adminNavGroupIds = new Set<AdminNavGroupId>([
  "community",
  "identity",
  "integration",
  "logs",
  "media",
  "system",
  "workspace",
]);

const fallbackGroupsById = new Map(adminNavGroups.map((group) => [group.id, group]));
const fallbackItemsById = new Map(
  adminNavGroups.flatMap((group) => group.items.map((item) => [item.id, item] as const)),
);

const iconBySystemName: Record<string, LucideIcon> = {
  "book-open": BookOpenText,
  "building-2": Building2,
  bug: Bug,
  "clipboard-check": ClipboardCheck,
  "code-2": Code2,
  flag: Flag,
  "heart-pulse": HeartPulse,
  history: History,
  "image-up": ImageUp,
  "key-round": KeyRound,
  "layout-dashboard": LayoutDashboard,
  "lock-keyhole": LockKeyhole,
  "log-in": LogIn,
  megaphone: Megaphone,
  "monitor-check": MonitorCheck,
  "package-check": PackageCheck,
  palette: Palette,
  "panel-left": PanelLeft,
  "scroll-text": ScrollText,
  send: Send,
  settings: Settings,
  shield: Shield,
  "shield-alert": ShieldAlert,
  "shield-check": ShieldCheck,
  "sliders-horizontal": SlidersHorizontal,
  "upload-cloud": ImageUp,
  users: Users,
  "users-round": UsersRound,
};

export function adminNavGroupsFromSystemMenus(
  groups: readonly SystemMenuGroup[] | null | undefined,
  pathname?: string,
): AdminNavGroup[] {
  let mappedGroups = minimalAdminNavGroups;

  if (groups?.length) {
    const mapped = groups
      .map(systemMenuGroupToAdminNavGroup)
      .filter((group): group is AdminNavGroup => group !== null);

    mappedGroups = mapped.length > 0 ? mapped : minimalAdminNavGroups;
  }

  return ensureActiveAdminNavRoute(mappedGroups, pathname);
}

export function adminNavLabel(
  target: Pick<AdminNavGroup | AdminNavItem, "label" | "labelKey">,
  translate: (key: string) => string,
) {
  return target.label || translate(target.labelKey);
}

export function normalizeAdminNavPath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function adminNavItemMatchesPath(item: AdminNavItem, pathname: string) {
  const normalizedPath = normalizeAdminNavPath(pathname);
  const normalizedTarget = normalizeAdminNavPath(item.to);

  if (item.end) {
    return normalizedPath === normalizedTarget;
  }

  return normalizedPath === normalizedTarget || normalizedPath.startsWith(`${normalizedTarget}/`);
}

export function findAdminNavGroup(
  pathname: string,
  groups: readonly AdminNavGroup[] = adminNavGroups,
) {
  return (
    groups.find((group) => group.items.some((item) => adminNavItemMatchesPath(item, pathname))) ??
    groups[0]
  );
}

export function findAdminNavGroupId(
  pathname: string,
  groups: readonly AdminNavGroup[] = adminNavGroups,
) {
  return findAdminNavGroup(pathname, groups).id;
}

export function findAdminNavItem(
  pathname: string,
  groups: readonly AdminNavGroup[] = adminNavGroups,
) {
  return (
    groups
      .flatMap((group) => group.items)
      .find((item) => adminNavItemMatchesPath(item, pathname)) ?? groups[0].items[0]
  );
}

export function hasAdminNavItemForPath(
  pathname: string,
  groups: readonly AdminNavGroup[] = adminNavGroups,
) {
  return groups.some((group) =>
    group.items.some((item) => adminNavItemMatchesPath(item, pathname)),
  );
}

function systemMenuGroupToAdminNavGroup(group: SystemMenuGroup): AdminNavGroup | null {
  if (!isAdminNavGroupId(group.code)) {
    return null;
  }
  const fallback = fallbackGroupsById.get(group.code);
  const items = group.items
    .map((item) => systemMenuItemToAdminNavItem(item))
    .filter((item): item is AdminNavItem => item !== null);
  if (items.length === 0) {
    return null;
  }

  return {
    icon: fallback?.icon ?? PanelLeft,
    id: group.code,
    items,
    label: group.label,
    labelKey: fallback?.labelKey ?? `admin.navGroups.${group.code}`,
  };
}

function ensureActiveAdminNavRoute(groups: AdminNavGroup[], pathname?: string): AdminNavGroup[] {
  if (!pathname || hasAdminNavItemForPath(pathname, groups)) {
    return groups;
  }

  const fallbackGroup = findAdminNavGroup(pathname, adminNavGroups);
  if (!fallbackGroup) {
    return groups;
  }

  const existingIndex = groups.findIndex((group) => group.id === fallbackGroup.id);
  if (existingIndex === -1) {
    return [...groups, fallbackGroup];
  }

  const existing = groups[existingIndex];
  const existingItemIds = new Set(existing.items.map((item) => item.id));
  const mergedGroup: AdminNavGroup = {
    ...existing,
    items: [
      ...existing.items,
      ...fallbackGroup.items.filter((item) => !existingItemIds.has(item.id)),
    ],
  };

  return groups.map((group, index) => (index === existingIndex ? mergedGroup : group));
}

function systemMenuItemToAdminNavItem(item: SystemMenuItem): AdminNavItem | null {
  const fallback = fallbackItemsById.get(item.code);
  const to = adminPathFromSystemMenuPath(item.path);
  if (!fallback && to === "/admin") {
    return {
      end: true,
      icon: iconForSystemMenu(item.icon, LayoutDashboard),
      id: item.code,
      label: item.label,
      labelKey: "admin.nav.dashboard",
      to,
    };
  }

  if (!fallback && item.code.trim() === "") {
    return null;
  }

  return {
    end: fallback?.end ?? to === "/admin",
    icon: iconForSystemMenu(item.icon, fallback?.icon),
    id: item.code,
    label: item.label,
    labelKey: fallback?.labelKey ?? `admin.nav.${item.code}`,
    to,
  };
}

function adminPathFromSystemMenuPath(path: string) {
  const normalized = normalizeAdminNavPath(path || "/");
  return normalized === "/" ? "/admin" : `/admin${normalized}`;
}

function iconForSystemMenu(icon: string, fallback?: LucideIcon) {
  return iconBySystemName[icon] ?? fallback ?? PanelLeft;
}

function isAdminNavGroupId(value: string): value is AdminNavGroupId {
  return adminNavGroupIds.has(value as AdminNavGroupId);
}
