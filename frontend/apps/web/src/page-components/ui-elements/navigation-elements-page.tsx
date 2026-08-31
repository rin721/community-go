'use client';

import { TabsView } from '@community-go/ui-adapter/data-display';
import { BreadcrumbTrail, PaginationControl, TextLink } from '@community-go/ui-adapter/navigation';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageSection } from '../../layouts/page-layout';
import { ComponentPreview } from './component-preview';
import { UiElementsFamilyPage } from './family-page';
export function NavigationElementsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(2);
  const [contentTab, setContentTab] = useState('overview');
  const [, setLastAction] = useState<string>();
  return (
    <UiElementsFamilyPage
      familyId="navigation"
      title={t('uiElements.navigationTitle')}
      description={t('uiElements.catalog.navigationDescription')}
    >
      {({ description }) => (
        <>
          <PageSection
            id="navigation"
            title={t('uiElements.navigationTitle')}
            description={t('uiElements.catalog.navigationDescription')}
          >
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <ComponentPreview
                name="TextLink"
                description={t('uiElements.catalog.textLinkDescription')}
                states={['Brand', 'Neutral', 'Leading / trailing icon', 'External', 'Host adapter']}
              >
                <div className="flex flex-wrap gap-5">
                  <TextLink href="#actions" leadingIcon={<ChevronRight />}>
                    {t('uiElements.catalog.backToActions')}
                  </TextLink>
                  <TextLink
                    href="#navigation"
                    tone="neutral"
                    trailingIcon={<ChevronRight />}
                    onNavigate={() => setLastAction('TextLink')}
                  >
                    {t('uiElements.catalog.interceptedLink')}
                  </TextLink>
                </div>
              </ComponentPreview>
              <ComponentPreview
                name="BreadcrumbTrail"
                description={t('uiElements.catalog.breadcrumbDescription')}
                states={['Linked', 'Disabled', 'Current', 'aria-current']}
              >
                <BreadcrumbTrail
                  label={t('layout.breadcrumb')}
                  items={[
                    { id: 'root', label: t('uiElements.breadcrumbRoot'), href: '/' },
                    {
                      id: 'disabled',
                      label: t('uiElements.catalog.disabledLevel'),
                      disabled: true,
                    },
                    { id: 'current', label: t('uiElements.breadcrumbCurrent') },
                  ]}
                />
              </ComponentPreview>
              <ComponentPreview
                name="PaginationControl"
                description={t('uiElements.catalog.paginationDescription')}
                states={['Current', 'Previous / next', 'Ellipsis', 'Boundary', 'Disabled']}
              >
                <div className="grid gap-4">
                  <PaginationControl
                    getPageLabel={(pageNumber) => t('uiElements.pageLabel', { page: pageNumber })}
                    label={t('uiElements.paginationLabel')}
                    nextLabel={t('uiElements.nextPage')}
                    onPageChange={setPage}
                    page={page}
                    previousLabel={t('uiElements.previousPage')}
                    totalPages={12}
                  />
                  <PaginationControl
                    disabled
                    getPageLabel={(pageNumber) => t('uiElements.pageLabel', { page: pageNumber })}
                    label={t('uiElements.catalog.disabledPagination')}
                    nextLabel={t('uiElements.nextPage')}
                    onPageChange={() => undefined}
                    page={1}
                    previousLabel={t('uiElements.previousPage')}
                    totalPages={1}
                  />
                </div>
              </ComponentPreview>
              <ComponentPreview
                name="TabsView"
                description={t('uiElements.catalog.tabsDescription')}
                states={['Selected', 'Disabled', 'Controlled', 'Keyboard', 'Content tabs only']}
              >
                <TabsView
                  label={t('uiElements.catalog.contentTabsLabel')}
                  selectedId={contentTab}
                  onSelectionChange={setContentTab}
                  items={[
                    {
                      id: 'overview',
                      label: t('uiElements.normalTab'),
                      content: <p className="p-4 text-sm text-ink-muted">{description}</p>,
                    },
                    {
                      id: 'activity',
                      label: t('uiElements.emptyTab'),
                      content: (
                        <p className="p-4 text-sm text-ink-muted">
                          {t('uiElements.dataTableEmpty')}
                        </p>
                      ),
                    },
                    {
                      id: 'locked',
                      label: t('uiElements.catalog.locked'),
                      content: null,
                      disabled: true,
                    },
                  ]}
                />
              </ComponentPreview>
            </div>
          </PageSection>
        </>
      )}
    </UiElementsFamilyPage>
  );
}
