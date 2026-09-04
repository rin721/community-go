'use client';

import { Page, PageHeader } from '@community-go/surface-foundation/layout';
import { StatusPill, type StatusTone } from '@community-go/ui-adapter/status-pill';
import { DescriptionList } from '@community-go/ui-adapter/description-list';
import { Panel } from '@community-go/ui-adapter/panel';
import { route, RouteLink } from '@community-go/plugin-framework/plugin';
import { useFrontendTranslation } from '@community-go/i18n';

import { getReferenceResources } from '../../data';
import type { ReferenceResource } from '../../data';

const statusTone: Record<ReferenceResource['status'], StatusTone> = {
  active: 'success',
  draft: 'warning',
};

export default function ReferenceResourcesDetailPage() {
  const { t } = useFrontendTranslation();
  const resource = getReferenceResources()[0] ?? null;

  return (
    <Page>
      <PageHeader
        eyebrow="Reference · File Routes"
        title={t('referenceResources.detail.title')}
        description={t('referenceResources.detail.description')}
        actions={
          <RouteLink target={route('reference-resources')}>
            {t('referenceResources.detail.back')}
          </RouteLink>
        }
      />
      {resource ? (
        <Panel className="overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">{resource.id}</p>
              <h2 className="mt-1 text-lg font-bold text-ink">{resource.name}</h2>
              <p className="mt-1 text-sm leading-6 text-ink-muted">{resource.description}</p>
            </div>
            <StatusPill tone={statusTone[resource.status]}>
              {t(`referenceResources.common.status.${resource.status}`)}
            </StatusPill>
          </div>
          <div className="p-5">
            <DescriptionList
              label={t('referenceResources.detail.title')}
              items={[
                {
                  id: 'kind',
                  term: t('referenceResources.common.kind'),
                  description: t(`referenceResources.common.${resource.kind}`),
                },
                {
                  id: 'status',
                  term: t('referenceResources.common.statusLabel'),
                  description: t(`referenceResources.common.status.${resource.status}`),
                },
              ]}
            />
          </div>
          <div className="flex justify-end border-t border-border p-4">
            <RouteLink target={route('reference-resources.edit')}>
              {t('referenceResources.detail.edit')}
            </RouteLink>
          </div>
        </Panel>
      ) : (
        <Panel className="p-6 text-sm text-ink-muted">{t('referenceResources.list.empty')}</Panel>
      )}
    </Page>
  );
}
