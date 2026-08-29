import { getNavigation, isNavigationHrefActive } from '@community-go/core';
import { IconAction } from '@community-go/ui-adapter';
import {
  Bell,
  Boxes,
  ChevronRight,
  CircleUserRound,
  Command,
  Languages,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Workflow,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router';

import { useShellStore } from '../state/use-shell-store';
import { BrandMark } from './brand-mark';

const iconByNavigationId = {
  overview: LayoutDashboard,
  foundations: Boxes,
  states: Workflow,
  preferences: Settings2,
} as const;

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigation = getNavigation();

  return (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-border px-5">
        <BrandMark />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold tracking-tight text-ink">
            {t('brand.name')}
          </p>
          <p className="truncate text-xs text-ink-muted">{t('brand.edition')}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6" aria-label="Primary navigation">
        {(['workspace', 'system'] as const).map((group) => (
          <div key={group}>
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-ink-muted/75">
              {t(`nav.${group}`)}
            </p>
            <div className="space-y-1">
              {navigation
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = iconByNavigationId[item.id as keyof typeof iconByNavigationId];
                  const active = isNavigationHrefActive(pathname, item.href);
                  return (
                    <NavLink
                      key={item.id}
                      to={item.href}
                      onClick={onNavigate}
                      className={`group flex h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors ${active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}
                    >
                      <Icon className="size-4.5" strokeWidth={active ? 2.3 : 1.9} />
                      <span className="flex-1">{t(item.labelKey)}</span>
                      {active ? <ChevronRight className="size-4" /> : null}
                    </NavLink>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-panel border border-brand/15 bg-brand-soft p-4">
        <div className="flex items-center gap-2 text-brand">
          <Sparkles className="size-4" />
          <span className="text-xs font-bold">{t('shell.preview')}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-muted">React 19 · HeroUI · Tailwind CSS v4</p>
      </div>
    </>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const theme = useShellStore((state) => state.theme);
  const locale = useShellStore((state) => state.locale);
  const mobileNavigationOpen = useShellStore((state) => state.mobileNavigationOpen);
  const setTheme = useShellStore((state) => state.setTheme);
  const setLocale = useShellStore((state) => state.setLocale);
  const setMobileNavigationOpen = useShellStore((state) => state.setMobileNavigationOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="shell-grid min-h-screen bg-canvas text-ink">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-surface lg:flex">
        <NavigationContent />
      </aside>

      <AnimatePresence>
        {mobileNavigationOpen ? (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-scrim backdrop-blur-sm lg:hidden"
              aria-label="Close navigation overlay"
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
                className="absolute right-3 top-5 grid size-10 place-items-center rounded-control text-ink-muted hover:bg-surface-muted"
                aria-label="Close navigation"
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
            className="grid size-10 place-items-center rounded-control border border-border bg-surface text-ink-muted lg:hidden"
            aria-label={t('shell.menu')}
            onClick={() => setMobileNavigationOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <label
            className="relative hidden min-w-0 max-w-md flex-1 md:block"
            htmlFor="global-search"
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="global-search"
              className="h-11 w-full rounded-control border border-border bg-surface pl-10 pr-20 text-sm text-ink shadow-sm placeholder:text-ink-muted/75"
              placeholder={t('shell.search')}
              type="search"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-semibold text-ink-muted">
              <Command className="size-3" /> K
            </span>
          </label>
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
              className="ml-1 flex h-11 items-center gap-2 rounded-control border border-border bg-surface px-2 pr-3 text-left"
              aria-label={t('shell.account')}
            >
              <span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-brand">
                <CircleUserRound className="size-4.5" />
              </span>
              <span className="hidden sm:block">
                <span className="block text-xs font-bold text-ink">Rin</span>
                <span className="block text-xs text-ink-muted">Product owner</span>
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
