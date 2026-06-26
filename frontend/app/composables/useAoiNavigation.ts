export interface AoiNavigationItem {
  active: boolean
  icon: string
  label: string
  to: string
}

export function useAoiNavigation() {
  const { t } = useI18n()
  const authSession = useAuthSessionStore()
  const route = useRoute()

  function isActive(path: string) {
    if (path === "/") {
      return route.path === "/"
    }

    return route.path === path || route.path.startsWith(`${path}/`)
  }

  const desktopPrimaryItems = computed<AoiNavigationItem[]>(() => [
    { icon: "home", label: t("nav.home"), to: "/", active: isActive("/") },
    { icon: "search", label: t("nav.search"), to: "/search", active: isActive("/search") },
    { icon: "layout-grid", label: t("nav.categories"), to: "/category", active: isActive("/category") },
    { icon: "history", label: t("nav.history"), to: "/history", active: isActive("/history") },
    { icon: "star", label: t("nav.collections"), to: "/collections", active: isActive("/collections") },
    { icon: "radio-tower", label: t("nav.following"), to: "/feed/following", active: isActive("/feed/following") },
    { icon: "bell", label: t("nav.notifications"), to: "/notifications", active: isActive("/notifications") },
    { icon: "upload", label: t("nav.upload"), to: "/upload", active: isActive("/upload") }
  ])

  const mobilePrimaryItems = computed<AoiNavigationItem[]>(() => [
    { icon: "home", label: t("nav.home"), to: "/", active: isActive("/") },
    { icon: "layout-grid", label: t("nav.categories"), to: "/category", active: isActive("/category") },
    { icon: "radio-tower", label: t("nav.following"), to: "/feed/following", active: isActive("/feed/following") },
    { icon: "search", label: t("nav.search"), to: "/search", active: isActive("/search") }
  ])

  const secondaryItems = computed<AoiNavigationItem[]>(() => [
    authSession.authenticated
      ? { icon: "circle-user-round", label: t("nav.account"), to: "/login", active: isActive("/login") || isActive("/register") }
      : { icon: "log-in", label: t("nav.login"), to: "/login", active: isActive("/login") || isActive("/register") },
    { icon: "settings", label: t("nav.settings"), to: "/settings", active: isActive("/settings") }
  ])

  return {
    desktopPrimaryItems,
    mobilePrimaryItems,
    secondaryItems
  }
}
