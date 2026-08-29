import { getNavigation, isNavigationHrefActive } from '@community-go/core';
import { CommandMenu, IconAction } from '@community-go/ui-adapter';
import {
  Bell,
  Boxes,
  ChevronRight,
  CircleUserRound,
  Component,
  FilePenLine,
  Languages,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Sparkles,
  Sun,
  TableProperties,
  Workflow,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { useShellStore } from '../state/use-shell-store';
import { BrandMark } from './brand-mark';

const iconByNavigationId = {
  overview: LayoutDashboard,
  foundations: Boxes,
  reference: TableProperties,
  formReference: FilePenLine,
  showcase: Component,
  states: Workflow,
  preferences: Settings2,
} as const;

function NavigationContent({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigation = getNavigation();

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
        className={`flex-1 space-y-7 overflow-y-auto py-6 ${compact ? 'px-2' : 'px-3'}`}
        aria-label={t('shell.primaryNav')}
      >
        {(['workspace', 'system'] as const).map((group) => (
          <div key={group}>
            {compact ? null : (
              <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
                {t(`nav.${group}`)}
              </p>
            )}
            <div className="space-y-1">
              {navigation
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = iconByNavigationId[item.id as keyof typeof iconByNavigationId];
                  const active = isNavigationHrefActive(pathname, item.href);
                  return (
                    <NavLink
                      aria-label={compact ? t(item.labelKey) : undefined}
                      className={`group flex h-11 items-center rounded-control text-sm font-semibold transition-colors ${compact ? 'justify-center px-2' : 'gap-3 px-3'} ${active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}
                      key={item.id}
                      title={compact ? t(item.labelKey) : undefined}
                      to={item.href}
                      onClick={onNavigate}
                    >
                      <Icon className="size-4.5 shrink-0" strokeWidth={active ? 2.3 : 1.9} />
                      {compact ? null : (
                        <>
                          <span className="flex-1">{t(item.labelKey)}</span>
                          {active ? <ChevronRight className="size-4" /> : null}
                        </>
                      )}
                    </NavLink>
                  );
                })}
            </div>
          </div>
        ))}
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

export function AppShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const commandItems = getNavigation().map((item) => ({
    id: item.href,
    label: t(item.labelKey),
    description: t('shell.commandDescription'),
  }));

  return (
    <div
      className="shell-grid min-h-screen bg-canvas text-ink"
      data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}
    >
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-surface lg:flex">
        <NavigationContent compact={sidebarCollapsed} />
      </aside>

      <AnimatePresence>
        {mobileNavigationOpen ? (
          <>
            <motion.button
              aria-label={t('shell.closeNavOverlay')}
              className="fixed inset-0 z-40 bg-scrim backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavigationOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface shadow-overlay lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <button
                aria-label={t('shell.closeNav')}
                className="absolute right-3 top-5 grid size-10 place-items-center rounded-control text-ink-muted hover:bg-surface-muted"
                onClick={() => setMobileNavigationOpen(false)}
              >
                <X className="size-5" />
              </button>
              <NavigationContent onNavigate={() => setMobileNavigationOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-border bg-canvas/90 px-4 backdrop-blur-xl sm:px-6 xl:px-8">
          <button
            aria-label={t('shell.menu')}
            className="grid size-10 place-items-center rounded-control border border-border bg-surface text-ink-muted lg:hidden"
            onClick={() => setMobileNavigationOpen(true)}
          >
            <Menu className="size-5" />
          </button>
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
              emptyLabel={t('showcase.commandEmpty')}
              isOpen={commandOpen}
              items={commandItems}
              searchLabel={t('showcase.commandSearchLabel')}
              searchPlaceholder={t('shell.search')}
              title={t('showcase.commandTitle')}
              triggerLabel={t('shell.searchShortcut')}
              onAction={(href) => {
                setCommandOpen(false);
                void navigate(href);
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
            <IconAction label={t('shell.notifications')}>
              <Bell className="size-4.5" />
            </IconAction>
            <button
              aria-label={t('shell.account')}
              className="ml-1 flex h-11 items-center gap-2 rounded-control border border-border bg-surface px-2 pr-3 text-left"
            >
              <span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-brand">
                <CircleUserRound className="size-4.5" />
              </span>
              <span className="hidden sm:block">
                <span className="block text-xs font-bold text-ink">Rin</span>
                <span className="block text-xs text-ink-muted">{t('shell.productOwner')}</span>
              </span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-screen-2xl p-4 sm:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
