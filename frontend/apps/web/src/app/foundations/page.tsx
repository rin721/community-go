'use client';

import { Card, CardContent } from '@community-go/ui-adapter/card';
import { Panel } from '@community-go/ui-adapter/panel';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { AppWindow, Braces, Component, DatabaseZap, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '../../layouts/page-layout';
import { PageTransition } from '../../host/page-transition';

const layers = [
  { id: 'hosts', icon: AppWindow, tone: 'bg-brand-soft text-brand' },
  { id: 'application', icon: Component, tone: 'bg-info-soft text-info' },
  { id: 'adapters', icon: DatabaseZap, tone: 'bg-warning-soft text-warning' },
  { id: 'stable', icon: Braces, tone: 'bg-success-soft text-success' },
] as const;

export default function FoundationsPage() {
  const { t } = useTranslation();
  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('foundations.eyebrow')}
          title={t('foundations.title')}
          description={t('foundations.description')}
          actions={<StatusPill tone="success">Executable boundaries</StatusPill>}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {layers.map(({ id, icon: Icon, tone }, index) => (
            <Card key={id}>
              <CardContent>
                <div className="relative">
                  <span className="absolute right-0 top-0 text-5xl font-black text-ink/5">
                    0{index + 1}
                  </span>
                  <span className={`grid size-11 place-items-center rounded-control ${tone}`}>
                    <Icon className="size-5" />
                  </span>
                  <h2 className="mt-5 text-lg font-bold text-ink">
                    {t(`foundations.layers.${id}`)}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
                    {t(`foundations.layers.${id}Description`)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="p-5 sm:p-6 xl:col-span-2" tone="brand">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-control bg-surface text-brand shadow-sm">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">{t('foundations.directUse')}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {t('foundations.directUseDescription')}
                </p>
              </div>
            </div>
          </Panel>
          <Panel className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">{t('foundations.rulesTitle')}</h2>
            <ol className="mt-4 space-y-3">
              {['first', 'second', 'third', 'fourth'].map((rule, index) => (
                <li key={rule} className="flex gap-3 text-sm leading-6 text-ink-muted">
                  <span className="font-bold text-brand">{index + 1}.</span>
                  <span>{t(`foundations.rules.${rule}`)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </PageTransition>
  );
}
