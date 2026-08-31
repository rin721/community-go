'use client';

import { Card, CardContent } from '@community-go/ui-adapter/card';
import { Panel } from '@community-go/ui-adapter/panel';
import { ProgressMeter } from '@community-go/ui-adapter/progress-meter';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleGauge,
  Layers3,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageTransition } from '../layouts/page-transition';
import { RouterTextLink } from '../host/router-text-link';

const capabilityDefinitions = [
  { id: 'design', progress: 78, icon: Layers3, status: 'ready' },
  { id: 'adapter', progress: 64, icon: Boxes, status: 'inProgress' },
  { id: 'hosts', progress: 46, icon: MonitorSmartphone, status: 'inProgress' },
  { id: 'gates', progress: 72, icon: ShieldCheck, status: 'ready' },
] as const;

const metrics = [
  { value: '6', label: 'boundaries', detail: 'ready', icon: Workflow },
  { value: '24', label: 'tokens', detail: 'shared', icon: Sparkles },
  { value: '10', label: 'states', detail: 'ready', icon: CircleGauge },
  { value: '2', label: 'hosts', detail: 'shared', icon: MonitorSmartphone },
] as const;

export default function OverviewPage() {
  const { t } = useTranslation();

  return (
    <PageTransition>
      <div className="space-y-6">
        <Panel className="relative overflow-hidden p-6 sm:p-8 xl:p-10" tone="brand">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              {t('overview.eyebrow')}
            </p>
            <h1 className="mt-4 max-w-2xl text-balance text-3xl font-extrabold tracking-tight text-ink sm:text-4xl xl:text-5xl">
              {t('overview.title')}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-muted sm:text-base">
              {t('overview.description')}
            </p>
            <div className="mt-7 flex flex-wrap gap-5">
              <RouterTextLink href="/foundations" leadingIcon={<Layers3 className="size-4" />}>
                {t('overview.action')}
              </RouterTextLink>
              <RouterTextLink href="/states" tone="neutral">
                {t('overview.secondaryAction')}
              </RouterTextLink>
            </div>
          </div>
        </Panel>

        <section className="metric-grid gap-4" aria-label="Foundation metrics">
          {metrics.map(({ value, label, detail, icon: Icon }) => (
            <Card key={label}>
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">
                      {t(`overview.metrics.${label}`)}
                    </p>
                    <p className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
                    <p className="mt-1 text-xs text-ink-muted">{t(`overview.metrics.${detail}`)}</p>
                  </div>
                  <span className="grid size-11 place-items-center rounded-control bg-brand-soft text-brand">
                    <Icon className="size-5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="p-5 sm:p-6 xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">{t('overview.progressTitle')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('overview.progressDescription')}</p>
              </div>
              <StatusPill tone="success">4 / 4 tracked</StatusPill>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {capabilityDefinitions.map(({ id, progress, icon: Icon, status }) => (
                <Card key={id} appearance="flat">
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface text-brand shadow-sm">
                        <Icon className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink">{t(`capability.${id}`)}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                          {t(`capability.${id}Description`)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ProgressMeter value={progress} label={t(`capability.${status}`)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Panel>

          <div className="grid gap-6">
            <Panel className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">{t('overview.qualityTitle')}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    {t('overview.qualityDescription')}
                  </p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-control bg-success-soft text-success">
                  <CheckCircle2 className="size-5" />
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {['Import boundaries', 'HeroUI isolation', 'Token governance', 'Host leakage'].map(
                  (gate) => (
                    <div
                      key={gate}
                      className="flex items-center gap-3 rounded-control bg-surface-muted px-3 py-2.5"
                    >
                      <CheckCircle2 className="size-4 text-success" />
                      <span className="flex-1 text-sm font-medium text-ink">{gate}</span>
                      <span className="text-xs font-semibold text-success">Active</span>
                    </div>
                  ),
                )}
              </div>
            </Panel>

            <Panel className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-control bg-info-soft text-info">
                  <CircleGauge className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink">{t('overview.activityTitle')}</h2>
                  <p className="text-xs text-ink-muted">{t('overview.activityDescription')}</p>
                </div>
              </div>
              <ol className="mt-5 space-y-4">
                {[
                  'Token contract established',
                  'Web Host shell composed',
                  'UI Adapter boundary active',
                ].map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                      {index + 1}
                    </span>
                    <div className="flex-1 border-b border-border pb-4 text-sm font-medium text-ink last:border-0 last:pb-0">
                      {item}
                    </div>
                    <ArrowRight className="mt-1 size-4 text-ink-muted" />
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
