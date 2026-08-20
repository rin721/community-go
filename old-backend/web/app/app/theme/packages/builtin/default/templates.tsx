import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Globe2, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

import { PreferenceMenu } from "~/components/console/patterns/PreferenceMenu";
import { RequireAuth } from "~/features/auth/RequireAuth";
import { AdminHeader } from "~/features/admin/AdminHeader";
import {
  adminNavGroups,
  adminNavGroupsFromSystemMenus,
  adminNavLabel,
  findAdminNavGroupId,
  type AdminNavGroup,
} from "~/features/admin/navigation";
import { usePublicSettings } from "~/hooks/usePublicSettings";
import type { AppLocale } from "~/i18n/resources";
import { supportedLocales } from "~/i18n/locales";
import { queryKeys } from "~/lib/api/query-keys";
import { systemApi } from "~/lib/api/system";

type TemplateProps = {
  children?: ReactNode;
};

export function PublicThemeLayout() {
  const { t } = useTranslation();
  const { brandName } = usePublicSettings();

  return (
    <div className="console-public-shell">
      <header className="console-public-header">
        <div className="console-public-header__inner">
          <Link className="console-brand" to="/">
            <span className="console-brand__mark" aria-hidden="true">
              <Globe2 size={18} />
            </span>
            <span>{brandName}</span>
          </Link>
          <nav className="console-nav" aria-label={t("a11y.primaryNavigation")}>
            <NavLink to="/">{t("site.nav.home")}</NavLink>
            <NavLink to="/about">{t("site.nav.about")}</NavLink>
            <NavLink to="/announcements">{t("site.nav.announcements")}</NavLink>
            <NavLink to="/blog">{t("site.nav.blog")}</NavLink>
            <NavLink to="/login">{t("common.actions.login")}</NavLink>
            <NavLink to="/admin">{t("site.nav.admin")}</NavLink>
          </nav>
          <PreferenceMenu />
        </div>
      </header>
      <Outlet />
      <footer className="console-footer">
        <div className="console-footer__inner">
          <p>{t("site.footer.description")}</p>
          <nav className="console-footer__links" aria-label={t("a11y.footerNavigation")}>
            <Link to="/terms">{t("site.nav.terms")}</Link>
            <Link to="/privacy">{t("site.nav.privacy")}</Link>
          </nav>
          <p>
            {brandName} {t("site.footer.copyright")}
          </p>
        </div>
      </footer>
    </div>
  );
}

export function AdminThemeLayout() {
  return (
    <RequireAuth>
      <AdminThemeShell />
    </RequireAuth>
  );
}

function AdminThemeShell() {
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const menusQuery = useQuery({
    queryFn: ({ signal }) => systemApi.listMenus({ signal }),
    queryKey: queryKeys.system.menus(i18n.language),
  });
  const navGroups = useMemo(
    () => adminNavGroupsFromSystemMenus(menusQuery.data, location.pathname),
    [location.pathname, menusQuery.data],
  );

  return (
    <div className="console-admin-shell">
      <aside className="console-admin-sidebar">
        <div className="console-brand">
          <span className="console-brand__mark" aria-hidden="true">
            <LayoutDashboard size={18} />
          </span>
          <span>{t("site.nav.admin")}</span>
        </div>
        <AdminSidebarNav groups={navGroups} pathname={location.pathname} />
      </aside>
      <div className="console-admin-content">
        <AdminHeader groups={navGroups} pathname={location.pathname} />
        <main className="console-admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminSidebarNav({
  groups = adminNavGroups,
  pathname,
}: {
  groups?: readonly AdminNavGroup[];
  pathname: string;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  const activeGroupId = useMemo(() => findAdminNavGroupId(pathname, groups), [groups, pathname]);
  const [navState, setNavState] = useState(() => ({
    openGroupId: activeGroupId,
    routeGroupId: activeGroupId,
  }));
  const openGroupId =
    navState.routeGroupId === activeGroupId ? navState.openGroupId : activeGroupId;

  return (
    <nav className="console-admin-nav" aria-label={t("a11y.adminNavigation")}>
      {groups.map((group) => {
        const GroupIcon = group.icon;
        const open = group.id === openGroupId;
        const active = group.id === activeGroupId;
        const contentId = `${baseId}-${group.id}`;

        return (
          <section
            className="console-admin-nav-group"
            data-active={active ? "true" : "false"}
            data-state={open ? "open" : "closed"}
            key={group.id}
          >
            <button
              aria-controls={contentId}
              aria-expanded={open}
              className="console-admin-nav-group__trigger"
              type="button"
              onClick={() =>
                setNavState({
                  openGroupId: group.id,
                  routeGroupId: activeGroupId,
                })
              }
            >
              <span className="console-admin-nav-group__label">
                <GroupIcon aria-hidden="true" size={17} />
                <span>{adminNavLabel(group, t)}</span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="console-admin-nav-group__chevron"
                size={16}
              />
            </button>
            {open ? (
              <div
                aria-label={adminNavLabel(group, t)}
                className="console-admin-nav-group__content"
                id={contentId}
                role="group"
              >
                {group.items.map((item) => {
                  const ItemIcon = item.icon;

                  return (
                    <NavLink
                      className="console-admin-nav__link"
                      end={item.end}
                      key={item.id}
                      to={item.to}
                    >
                      <ItemIcon aria-hidden="true" size={17} />
                      <span>{adminNavLabel(item, t)}</span>
                    </NavLink>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}

export function SetupThemeLayout() {
  const { i18n, t } = useTranslation();

  return (
    <div className="console-setup-shell">
      <header className="console-setup-header">
        <div className="console-setup-header__inner">
          <div className="console-brand">
            <span className="console-brand__mark" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <span>{t("setup.title")}</span>
          </div>
          <select
            className="console-language-select"
            aria-label={t("a11y.languageSwitcher")}
            value={i18n.language}
            onChange={(event) => {
              const locale = event.target.value;
              if (supportedLocales.includes(locale as AppLocale)) {
                void i18n.changeLanguage(locale);
              }
            }}
          >
            {supportedLocales.map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export function AuthThemeTemplate({ children }: TemplateProps) {
  return <>{children}</>;
}

export function DashboardThemeTemplate({ children }: TemplateProps) {
  return <>{children}</>;
}

export function DetailPageThemeTemplate({ children }: TemplateProps) {
  return <>{children}</>;
}

export function ErrorThemeTemplate({ children }: TemplateProps) {
  return <>{children}</>;
}

export function ListPageThemeTemplate({ children }: TemplateProps) {
  return <>{children}</>;
}

export function LoadingThemeTemplate({ children }: TemplateProps) {
  return <>{children}</>;
}

export function SettingsThemeTemplate({ children }: TemplateProps) {
  return <>{children}</>;
}
