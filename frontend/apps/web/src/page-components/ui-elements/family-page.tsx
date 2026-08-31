'use client';

import { Badge } from '@community-go/ui-adapter/feedback';
import { SelectField, SwitchField } from '@community-go/ui-adapter/form-field';
import { Panel } from '@community-go/ui-adapter/panel';
import { ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterTextLink } from '../../host/router-text-link';
import { usePageSearchParams } from '../../host/use-page-search-params';
import { PageHeader, PageLayout } from '../../layouts/page-layout';
import { useShellStore } from '../../state/use-shell-store';

const uiElementFamilies = [
  { id: 'actions-selection', labelKey: 'nav.uiActionsSelection', count: 3 },
  { id: 'feedback', labelKey: 'nav.uiFeedback', count: 4 },
  { id: 'status-async', labelKey: 'nav.uiStatusAsync', count: 5 },
  { id: 'identity-display', labelKey: 'nav.uiIdentityDisplay', count: 3 },
  { id: 'navigation', labelKey: 'nav.uiNavigation', count: 4 },
  { id: 'data', labelKey: 'nav.uiData', count: 1 },
  { id: 'surfaces', labelKey: 'nav.uiSurfaces', count: 2 },
  { id: 'forms', labelKey: 'nav.uiForms', count: 9 },
  { id: 'overlays', labelKey: 'nav.uiOverlays', count: 8 },
] as const;

type UiElementFamilyId = (typeof uiElementFamilies)[number]['id'];
type UiElementsPageContext = Readonly<{
  density: 'comfortable' | 'compact';
  longText: boolean;
  setLongText: (enabled: boolean) => void;
  description: string;
  spacing: string;
}>;

export function UiElementsFamilyPage({
  familyId,
  title,
  description: familyDescription,
  children,
}: Readonly<{
  familyId: UiElementFamilyId;
  title: string;
  description: string;
  children: (context: UiElementsPageContext) => ReactNode;
}>) {
  const { t } = useTranslation();
  const searchParams = usePageSearchParams();
  const locale = useShellStore((state) => state.locale);
  const setLocale = useShellStore((state) => state.setLocale);
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    searchParams.get('density') === 'compact' ? 'compact' : 'comfortable',
  );
  const [longText, setLongText] = useState(false);
  const description = longText ? t('uiElements.longDescription') : t('uiElements.shortDescription');
  const spacing = density === 'compact' ? 'gap-2' : 'gap-4';
  const family = uiElementFamilies.find(({ id }) => id === familyId)!;

  return (
    <PageLayout>
      <PageHeader
        breadcrumbLabel={t('layout.breadcrumb')}
        breadcrumbs={[
          { label: t('uiElements.breadcrumbRoot') },
          { label: t('nav.uiElements') },
          { label: title, current: true },
        ]}
        eyebrow={t('uiElements.eyebrow')}
        title={title}
        description={familyDescription}
      />

      <Panel className="grid gap-4 p-4 md:grid-cols-3">
        <SelectField
          label={t('uiElements.density')}
          options={[
            { value: 'comfortable', label: t('uiElements.comfortable') },
            { value: 'compact', label: t('uiElements.compact') },
          ]}
          value={density}
          onValueChange={(value) => setDensity(value as 'comfortable' | 'compact')}
        />
        <SwitchField
          label={t('uiElements.longText')}
          description={t('uiElements.longTextDescription')}
          checked={longText}
          onCheckedChange={setLongText}
        />
        <SwitchField
          label={t('uiElements.locale')}
          description={t('uiElements.localeDescription')}
          checked={locale === 'en'}
          onCheckedChange={(enabled) => setLocale(enabled ? 'en' : 'zh-CN')}
        />
      </Panel>

      <Panel aria-label={t('uiElements.catalog.label')} className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              {t('uiElements.catalog.kicker')}
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{familyDescription}</p>
          </div>
          <Badge appearance="solid" tone="info" size="md">
            {family.count} / {t('uiElements.catalog.total', { count: 39 })}
          </Badge>
        </div>
        <nav aria-label={t('uiElements.catalog.label')} className="mt-5 flex flex-wrap gap-2">
          {uiElementFamilies.map((item) => (
            <RouterTextLink
              href={`/ui-elements/${item.id}`}
              key={item.id}
              trailingIcon={<ChevronRight />}
            >
              {t(item.labelKey)} · {item.count}
            </RouterTextLink>
          ))}
        </nav>
      </Panel>

      {children({ density, longText, setLongText, description, spacing })}
    </PageLayout>
  );
}
