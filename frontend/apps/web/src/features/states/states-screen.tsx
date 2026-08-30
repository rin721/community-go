import { Panel, Skeleton, StateSurface } from '@community-go/ui-adapter';
import type { ProductState } from '@community-go/types';
import {
  Ban,
  CheckCircle2,
  Clock3,
  CloudOff,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  OctagonAlert,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeading } from '../../components/page-heading';

const stateDefinitions = [
  { id: 'empty', icon: Inbox },
  { id: 'error', icon: OctagonAlert },
  { id: 'success', icon: CheckCircle2 },
  { id: 'warning', icon: TriangleAlert },
  { id: 'disabled', icon: Ban },
  { id: 'pending', icon: Clock3 },
  { id: 'offline', icon: CloudOff },
  { id: 'permission-denied', icon: LockKeyhole },
] as const satisfies readonly { id: ProductState; icon: typeof Inbox }[];

export function StatesScreen() {
  const { t } = useTranslation();
  const [errorRecovered, setErrorRecovered] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={t('states.eyebrow')}
        title={t('states.title')}
        description={t('states.description')}
      />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel aria-busy="true" aria-label={t('states.loading.title')} className="p-5">
          <div className="flex items-center gap-3 text-info">
            <LoaderCircle className="size-5 animate-spin" />
            <span className="text-sm font-bold text-ink">{t('states.loading.title')}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-muted">{t('states.loading.description')}</p>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Panel>
        {stateDefinitions.map(({ id, icon: Icon }) => {
          const recovered = id === 'error' && errorRecovered;
          const DisplayIcon = recovered ? CheckCircle2 : Icon;
          const displayedState = recovered ? 'success' : id;
          const translationKey = recovered ? 'recovered' : id;

          return (
            <Panel key={id}>
              <StateSurface
                compact
                state={displayedState}
                icon={<DisplayIcon className="size-5" />}
                title={t(`states.${translationKey}.title`)}
                description={t(`states.${translationKey}.description`)}
                announcement={recovered ? 'polite' : 'none'}
                {...(id === 'error' && !recovered
                  ? { actionLabel: t('states.retry'), onAction: () => setErrorRecovered(true) }
                  : {})}
              />
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
