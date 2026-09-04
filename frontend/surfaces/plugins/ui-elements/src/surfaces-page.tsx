'use client';

import { Action } from '@community-go/ui-adapter/action';
import { Card, CardContent, CardFooter, CardHeader } from '@community-go/ui-adapter/card';
import { TabsView } from '@community-go/ui-adapter/data-display';
import { Badge } from '@community-go/ui-adapter/feedback';
import { Panel } from '@community-go/ui-adapter/panel';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { StateSurface } from '@community-go/ui-adapter/state-surface';
import { AlertTriangle, CheckCircle2, Inbox } from 'lucide-react';
import { useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import { Section } from '@community-go/surface-foundation/layout';
import { ComponentPreview } from './component-preview';
import { UiElementsFamilyPage } from './family-page';
export function SurfacesPage() {
  const { t } = useFrontendTranslation();
  const [, setLastAction] = useState<string>();
  return (
    <UiElementsFamilyPage
      familyId="surfaces"
      title={t('uiElements.cardsTitle')}
      description={t('uiElements.cardsDescription')}
    >
      {({ description }) => (
        <>
          <Section
            id="surfaces"
            title={t('uiElements.cardsTitle')}
            description={t('uiElements.cardsDescription')}
          >
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <ComponentPreview
                embedded
                fullWidth
                name="Card / CardHeader / CardContent / CardFooter"
                description={t('uiElements.catalog.cardDescription')}
                states={[
                  'Elevated',
                  'Outlined',
                  'Flat',
                  'Header',
                  'Action',
                  'Content',
                  'Footer',
                  'Long content',
                ]}
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card>
                    <CardHeader
                      action={<Badge tone="info">{t('uiElements.elevatedCardBadge')}</Badge>}
                      title={t('uiElements.elevatedCardTitle')}
                    />
                    <CardContent>
                      <p className="text-sm leading-6 text-ink-muted">{description}</p>
                    </CardContent>
                    <CardFooter>
                      <Action
                        size="sm"
                        onPress={() => setLastAction(t('uiElements.elevatedCardTitle'))}
                      >
                        {t('uiElements.cardAction')}
                      </Action>
                    </CardFooter>
                  </Card>
                  <Card appearance="outlined">
                    <CardHeader
                      action={<Badge>{t('uiElements.outlinedCardBadge')}</Badge>}
                      title={t('uiElements.outlinedCardTitle')}
                    />
                    <CardContent>
                      <p className="text-sm leading-6 text-ink-muted">{description}</p>
                    </CardContent>
                    <CardFooter>
                      <Action
                        variant="secondary"
                        size="sm"
                        onPress={() => setLastAction(t('uiElements.outlinedCardTitle'))}
                      >
                        {t('uiElements.cardAction')}
                      </Action>
                    </CardFooter>
                  </Card>
                  <Card appearance="flat">
                    <CardHeader
                      action={<Badge tone="neutral">{t('uiElements.embeddedCardBadge')}</Badge>}
                      title={t('uiElements.embeddedCardTitle')}
                    />
                    <CardContent>
                      <p className="text-sm leading-6 text-ink-muted">{description}</p>
                    </CardContent>
                    <CardFooter>
                      <Action
                        variant="quiet"
                        size="sm"
                        onPress={() => setLastAction(t('uiElements.embeddedCardTitle'))}
                      >
                        {t('uiElements.cardAction')}
                      </Action>
                    </CardFooter>
                  </Card>
                </div>
              </ComponentPreview>
              <ComponentPreview
                embedded
                fullWidth
                name="Panel"
                description={t('uiElements.catalog.panelDescription')}
                states={[
                  'Elevated',
                  'Outlined',
                  'Embedded',
                  'Default / muted / brand',
                  'Layout surface',
                ]}
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  <Panel className="p-4">
                    <p className="font-semibold text-ink">Elevated · Default</p>
                    <p className="mt-2 text-sm text-ink-muted">{description}</p>
                  </Panel>
                  <Panel appearance="outlined" tone="brand" className="p-4">
                    <p className="font-semibold text-ink">Outlined · Brand</p>
                    <p className="mt-2 text-sm text-ink-muted">{description}</p>
                  </Panel>
                  <Panel appearance="embedded" tone="muted" className="rounded-panel p-4">
                    <p className="font-semibold text-ink">Embedded · Muted</p>
                    <p className="mt-2 text-sm text-ink-muted">{description}</p>
                  </Panel>
                </div>
              </ComponentPreview>
            </div>
          </Section>

          <Section
            title={t('uiElements.compositionTitle')}
            description={t('uiElements.compositionDescription')}
          >
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <Panel appearance="outlined" className="overflow-hidden">
                <div className="border-b border-border p-4">
                  <h3 className="font-bold text-ink">{t('uiElements.embeddedTitle')}</h3>
                </div>
                <Panel appearance="embedded" tone="muted" className="p-4">
                  <SearchBox
                    label={t('reference.searchLabel')}
                    placeholder={t('reference.searchPlaceholder')}
                  />
                  <p className="mt-3 text-sm leading-6 text-ink-muted">{description}</p>
                </Panel>
              </Panel>
              <Panel appearance="outlined" className="p-4">
                <TabsView
                  label={t('uiElements.tabsLabel')}
                  variant="section"
                  items={[
                    {
                      id: 'normal',
                      label: t('uiElements.normalTab'),
                      content: (
                        <StateSurface
                          compact
                          state="success"
                          icon={<CheckCircle2 className="size-5" />}
                          title={t('states.success.title')}
                          description={t('states.success.description')}
                        />
                      ),
                    },
                    {
                      id: 'empty',
                      label: t('uiElements.emptyTab'),
                      content: (
                        <StateSurface
                          compact
                          state="empty"
                          icon={<Inbox className="size-5" />}
                          title={t('states.empty.title')}
                          description={t('states.empty.description')}
                        />
                      ),
                    },
                    {
                      id: 'warning',
                      label: t('uiElements.warningTab'),
                      content: (
                        <StateSurface
                          compact
                          state="warning"
                          icon={<AlertTriangle className="size-5" />}
                          title={t('states.warning.title')}
                          description={t('states.warning.description')}
                        />
                      ),
                    },
                  ]}
                />
              </Panel>
            </div>
          </Section>
        </>
      )}
    </UiElementsFamilyPage>
  );
}
