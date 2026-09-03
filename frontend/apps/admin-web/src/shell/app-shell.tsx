'use client';

import { flattenNavigationLeaves } from '@community-go/core';
import { AdminShellRoot } from '@community-go/admin-foundation/shell-navigation';
import { AdminLocaleProvider } from '@community-go/admin-framework/plugin';
import type { NavigationNode } from '@community-go/types';
import { IconAction } from '@community-go/ui-adapter/icon-action';
import { UserIdentity } from '@community-go/ui-adapter/identity';
import { MenuButton } from '@community-go/ui-adapter/menu-button';
import {
  Languages,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import type { ReactNode } from 'react';

import { markForwardRouteIntent, pageTransitionTypes } from '../host/route-transition-constants';
import { AdminHostNavigationPortProvider } from '../host/admin-navigation-port';
import { adminHostRouteTargetResolver } from '../host/admin-route-target-resolver';
import { shouldProceedWithNavigation } from '../host/navigation-lifecycle';
import { RouteTransition } from '../host/route-transition';
import { TopProgress } from '../host/top-progress';
import { useShellStore } from '../state/use-shell-store';
import { BrandMark } from './brand-mark';
import { combinedShellNavigationGroups } from './navigation';
import { NavigationTree } from './navigation-tree';

const CommandMenu = dynamic(
  () => import('@community-go/ui-adapter/command-menu').then((module) => module.CommandMenu),
  { ssr: false },
);

function NavigationContent({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { t } = useFrontendTranslation();

  return (
    <>
      <div
        className={`flex h-20 items-center border-b border-border ${compact ? 'justify-center px-3' : 'gap-3 px-5'}`}
      >
        <BrandMark />
        {compact ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-ink">
              {t('brand.name')}
            </p>
            <p className="truncate text-xs text-ink-muted">{t('brand.edition')}</p>
          </div>
        )}
      </div>
      <nav
        className={`admin-shell-navigation-viewport flex-1 space-y-7 py-6 ${compact ? 'px-2' : 'px-3'}`}
        aria-label={t('shell.primaryNav')}
      >
        <NavigationTree
          compact={compact}
          groups={combinedShellNavigationGroups}
          onNavigate={onNavigate}
        />
      </nav>
      {compact ? null : (
        <div className="m-3 rounded-panel border border-brand/15 bg-brand-soft p-4">
          <div className="flex items-center gap-2 text-brand">
            <Sparkles className="size-4" />
            <span className="text-xs font-bold">{t('shell.preview')}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            React 19 · HeroUI · Tailwind CSS v4
          </p>
        </div>
      )}
    </>
  );
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useFrontendTranslation();
  const router = useRouter();
  const theme = useShellStore((state) => state.theme);
  const locale = useShellStore((state) => state.locale);
  const mobileNavigationOpen = useShellStore((state) => state.mobileNavigationOpen);
  const sidebarCollapsed = useShellStore((state) => state.sidebarCollapsed);
  const setTheme = useShellStore((state) => state.setTheme);
  const setLocale = useShellStore((state) => state.setLocale);
  const setMobileNavigationOpen = useShellStore((state) => state.setMobileNavigationOpen);
  const setSidebarCollapsed = useShellStore((state) => state.setSidebarCollapsed);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commandItems = flattenNavigationLeaves(
    combinedShellNavigationGroups.flatMap((group) => group.items as readonly NavigationNode[]),
  ).map(({ leaf, ancestors }) => ({
    id: leaf.href,
    label: t(leaf.labelKey),
    description:
      ancestors.length > 0
        ? ancestors.map((ancestor) => t(ancestor.labelKey)).join(' / ')
        : t('shell.commandDescription'),
  }));

  return (
    <AdminShellRoot collapsed={sidebarCollapsed}>
      <TopProgress />
      <aside
        className="sticky top-0 hidden h-screen flex-col border-r border-border bg-surface lg:flex"
        style={{ viewTransitionName: 'app-sidebar' }}
      >
        <NavigationContent compact={sidebarCollapsed} />
      </aside>

      {mobileNavigationOpen ? (
        <>
          <button
            aria-label={t('shell.closeNavOverlay')}
            className="fixed inset-0 z-sticky bg-scrim backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavigationOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-overlay flex w-72 flex-col bg-surface shadow-overlay lg:hidden">
            <div className="absolute right-3 top-5">
              <IconAction
                label={t('shell.closeNav')}
                onPress={() => setMobileNavigationOpen(false)}
              >
                <X className="size-5" />
              </IconAction>
            </div>
            <NavigationContent onNavigate={() => setMobileNavigationOpen(false)} />
          </aside>
        </>
      ) : null}

      <div className="min-w-0">
        <header
          className="sticky top-0 z-sticky flex h-20 items-center gap-3 border-b border-border bg-canvas/90 px-4 backdrop-blur-xl sm:px-6 xl:px-8"
          style={{ viewTransitionName: 'app-header' }}
        >
          <div className="lg:hidden">
            <IconAction label={t('shell.menu')} onPress={() => setMobileNavigationOpen(true)}>
              <Menu className="size-5" />
            </IconAction>
          </div>
          <div className="hidden lg:block">
            <IconAction
              label={sidebarCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
              onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4.5" />
              ) : (
                <PanelLeftClose className="size-4.5" />
              )}
            </IconAction>
          </div>
          <div className="hidden min-w-0 flex-1 md:block">
            <CommandMenu
              defaultOpen={false}
              emptyLabel={t('uiElements.commandEmpty')}
              isOpen={commandOpen}
              items={commandItems}
              searchLabel={t('uiElements.commandSearchLabel')}
              searchPlaceholder={t('shell.search')}
              title={t('uiElements.commandTitle')}
              triggerLabel={t('shell.searchShortcut')}
              onAction={(href) => {
                setCommandOpen(false);
                if (!shouldProceedWithNavigation(href, t('shell.search'))) return;
                markForwardRouteIntent();
                void router.push(href, { transitionTypes: [pageTransitionTypes.forward] });
              }}
              onOpenChange={setCommandOpen}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <IconAction
              label={t('shell.locale')}
              onPress={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')}
            >
              <Languages className="size-4.5" />
            </IconAction>
            <IconAction
              label={t('shell.theme')}
              onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
            </IconAction>
            <MenuButton
              ariaLabel={t('shell.account')}
              items={[
                {
                  id: '/system-tools/preferences',
                  label: t('nav.preferences'),
                  description: t('preferences.description'),
                },
              ]}
              label={
                <UserIdentity avatarSize="sm" description={t('shell.productOwner')} name="Rin" />
              }
              onAction={(href) => {
                if (!shouldProceedWithNavigation(href, t('shell.account'))) return;
                markForwardRouteIntent();
                void router.push(href, { transitionTypes: [pageTransitionTypes.forward] });
              }}
            />
          </div>
        </header>
        <main className="mx-auto max-w-screen-2xl p-4 sm:p-6 xl:p-8" id="main-content">
          <RouteTransition>
            <AdminLocaleProvider
              port={{
                locale,
                changeLocale: (next) => {
                  if (next === 'en' || next === 'zh-CN') setLocale(next);
                },
              }}
            >
              <AdminHostNavigationPortProvider
                resolveHref={adminHostRouteTargetResolver.resolveHref}
              >
                {children}
              </AdminHostNavigationPortProvider>
            </AdminLocaleProvider>
          </RouteTransition>
        </main>
      </div>
    </AdminShellRoot>
  );
}
