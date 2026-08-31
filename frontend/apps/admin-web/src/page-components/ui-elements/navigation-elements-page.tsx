'use client';

import { TabsView } from '@community-go/ui-adapter/data-display';
import { DisclosurePanel } from '@community-go/ui-adapter/disclosure';
import { BreadcrumbTrail, PaginationControl, TextLink } from '@community-go/ui-adapter/navigation';
import { StepNavigation } from '@community-go/ui-adapter/step-navigation';
import { Tree } from '@community-go/ui-adapter/tree';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import { AdminSection } from '@community-go/admin-foundation/layout';
import { ComponentPreview } from './component-preview';
import { UiElementsFamilyPage } from './family-page';
export function NavigationElementsPage() {
  const { t } = useFrontendTranslation();
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
          <AdminSection
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
              <ComponentPreview
                name="StepNavigation"
                description="有限步骤只表达当前位置、完成与错误，不代替页面 Tabs。"
                states={['Upcoming', 'Current', 'Complete', 'Error', 'Disabled']}
              >
                <StepNavigation
                  label="Foundation steps"
                  items={[
                    { id: 'contract', label: 'Contract', state: 'complete' },
                    { id: 'accessibility', label: 'Accessibility', state: 'current' },
                    { id: 'evidence', label: 'Evidence' },
                  ]}
                />
              </ComponentPreview>
              <ComponentPreview
                name="Tree"
                description="层级集合统一键盘导航、展开、选择与 disabled 语义。"
                states={['Nested', 'Expanded', 'Selected', 'Disabled', 'Keyboard']}
              >
                <Tree
                  collapseLabel={(label) => t('uiElements.catalog.treeCollapse', { label })}
                  defaultExpandedIds={new Set(['foundation'])}
                  expandLabel={(label) => t('uiElements.catalog.treeExpand', { label })}
                  label="Foundation tree"
                  nodes={[
                    {
                      id: 'foundation',
                      label: 'Universal Foundation',
                      children: [
                        { id: 'elements', label: 'UI Elements' },
                        { id: 'motion', label: 'Motion', disabled: true },
                      ],
                    },
                    { id: 'admin', label: 'Admin Foundation' },
                  ]}
                  selectionMode="single"
                />
              </ComponentPreview>
              <ComponentPreview
                name="DisclosurePanel"
                description="可展开补充内容由 React Aria/HeroUI 持有状态与焦点语义。"
                states={['Collapsed', 'Expanded', 'Disabled', 'Keyboard']}
              >
                <DisclosurePanel defaultExpanded title="Composition boundary">
                  Disclosure 不承担页面导航，也不主持 Overlay。
                </DisclosurePanel>
              </ComponentPreview>
            </div>
          </AdminSection>
        </>
      )}
    </UiElementsFamilyPage>
  );
}
