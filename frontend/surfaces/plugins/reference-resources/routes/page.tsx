'use client';

import { Page, PageHeader } from '@community-go/surface-foundation/layout';
import { StatusPill, type StatusTone } from '@community-go/ui-adapter/status-pill';
import { Panel } from '@community-go/ui-adapter/panel';
import { route, RouteLink } from '@community-go/plugin-framework/plugin';
import { useFrontendTranslation } from '@community-go/i18n';

import { getReferenceResources, type ReferenceResource } from '../data';

const statusTone: Record<ReferenceResource['status'], StatusTone> = {
  active: 'success',
  draft: 'warning',
};

export default function ReferenceResourcesListPage() {
  const { t } = useFrontendTranslation();
  const resources = getReferenceResources();

  return (
    <Page>
      <PageHeader
        eyebrow="Reference · File Routes"
        title={t('referenceResources.list.title')}
        description={t('referenceResources.list.description')}
        actions={
          <RouteLink target={route('reference-resources.create')}>
            {t('referenceResources.list.create')}
          </RouteLink>
        }
      />
      {resources.length === 0 ? (
        <Panel className="p-6 text-sm text-ink-muted">{t('referenceResources.list.empty')}</Panel>
      ) : (
        <ul className="grid gap-4">
          {resources.map((resource) => (
            <li className="rounded-panel border border-border bg-surface p-5" key={resource.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand">
                    {resource.id}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-ink">{resource.name}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">{resource.description}</p>
                </div>
                <StatusPill tone={statusTone[resource.status]}>
                  {t(`referenceResources.common.status.${resource.status}`)}
                </StatusPill>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <RouteLink target={route('reference-resources.detail')}>
                  {t('referenceResources.list.detail')}
                </RouteLink>
                <RouteLink target={route('reference-resources.edit')}>
                  {t('referenceResources.list.edit')}
                </RouteLink>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
