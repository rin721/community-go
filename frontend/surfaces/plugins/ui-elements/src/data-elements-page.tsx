'use client';

import { Action } from '@community-go/ui-adapter/action';
import { DataTable } from '@community-go/ui-adapter/data-display';
import { Badge } from '@community-go/ui-adapter/feedback';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { ToggleGroup } from '@community-go/ui-adapter/toggle-group';
import type { DataColumn } from '@community-go/ui-adapter/data-display';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFrontendTranslation } from '@community-go/i18n';
import { Section } from '@community-go/surface-foundation/layout';
import { usePluginLocale } from '@community-go/plugin-framework/plugin';
import { ComponentPreview } from './component-preview';
import { UiElementsFamilyPage } from './family-page';

type UiElementsDataRow = Readonly<{
  id: string;
  element: string;
  owner: string;
  status: string;
  tone: 'success' | 'warning' | 'info';
}>;
export function DataElementsPage() {
  const { t } = useFrontendTranslation();
  const searchParams = useSearchParams();
  const { locale } = usePluginLocale();
  const [selectedTableId, setSelectedTableId] = useState('UI-001');
  const [selectedTableIds, setSelectedTableIds] = useState<readonly string[]>([]);
  const [tableMode, setTableMode] = useState<'single' | 'multiple' | 'empty'>(
    searchParams.get('data') === 'empty' ? 'empty' : 'single',
  );
  const [tableSort, setTableSort] = useState<{
    columnId: string;
    direction: 'ascending' | 'descending';
  }>({ columnId: 'element', direction: 'descending' });
  const tableRows: readonly UiElementsDataRow[] = [
    {
      id: 'UI-001',
      element: t('uiElements.dataTableRows.tokens'),
      owner: t('uiElements.dataTableOwners.foundation'),
      status: t('uiElements.dataTableStatus.ready'),
      tone: 'success',
    },
    {
      id: 'UI-002',
      element: t('uiElements.dataTableRows.formControl'),
      owner: t('uiElements.dataTableOwners.interaction'),
      status: t('uiElements.dataTableStatus.review'),
      tone: 'warning',
    },
    {
      id: 'UI-003',
      element: t('uiElements.dataTableRows.overlaySurface'),
      owner: t('uiElements.dataTableOwners.composition'),
      status: t('uiElements.dataTableStatus.verified'),
      tone: 'info',
    },
  ];
  const tableColumns: readonly DataColumn<UiElementsDataRow>[] = [
    {
      id: 'element',
      label: t('uiElements.dataTableColumns.element'),
      rowHeader: true,
      sortable: true,
      render: (row) => (
        <div className="min-w-40">
          <p className="font-semibold text-ink">{row.element}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{row.id}</p>
        </div>
      ),
    },
    {
      id: 'owner',
      label: t('uiElements.dataTableColumns.owner'),
      sortable: true,
      render: (row) => row.owner,
    },
    {
      id: 'status',
      label: t('uiElements.dataTableColumns.status'),
      render: (row) => <StatusPill tone={row.tone}>{row.status}</StatusPill>,
    },
  ];
  const visibleTableColumns = tableColumns;
  const visibleTableRows = [...tableRows].sort((left, right) => {
    const leftValue = String(left[tableSort.columnId as keyof UiElementsDataRow]);
    const rightValue = String(right[tableSort.columnId as keyof UiElementsDataRow]);
    const result = leftValue.localeCompare(rightValue, locale);
    return tableSort.direction === 'ascending' ? result : -result;
  });

  return (
    <UiElementsFamilyPage
      familyId="data"
      title={t('uiElements.dataDisplayTitle')}
      description={t('uiElements.dataDisplayDescription')}
    >
      {({ density }) => (
        <>
          <Section
            id="data"
            title={t('uiElements.dataDisplayTitle')}
            description={t('uiElements.dataDisplayDescription')}
          >
            <div className="p-5">
              <ComponentPreview
                fullWidth
                name="DataTable"
                description={t('uiElements.catalog.dataTableDescription')}
                states={[
                  'Display',
                  'Sort',
                  'Single / multiple selection',
                  'Row header',
                  'Empty',
                  'Density',
                  'Overflow',
                ]}
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <ToggleGroup
                    label={t('uiElements.catalog.tableMode')}
                    options={[
                      { id: 'single', label: t('uiElements.catalog.singleSelection') },
                      { id: 'multiple', label: t('uiElements.catalog.multipleSelection') },
                      { id: 'empty', label: t('uiElements.dataTableShowEmpty') },
                    ]}
                    selectedIds={[tableMode]}
                    onSelectionChange={(ids) => {
                      const mode = ids[0];
                      if (mode === 'single' || mode === 'multiple' || mode === 'empty')
                        setTableMode(mode);
                    }}
                    selectionMode="single"
                    size="sm"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">
                      {density} · {visibleTableColumns.length} columns
                    </Badge>
                    <Action
                      size="sm"
                      variant="secondary"
                      onPress={() => setTableMode(tableMode === 'empty' ? 'single' : 'empty')}
                    >
                      {tableMode === 'empty'
                        ? t('uiElements.dataTableRestoreRows')
                        : t('uiElements.dataTableShowEmpty')}
                    </Action>
                  </div>
                </div>
                <div className="mt-4">
                  <DataTable
                    label={t('uiElements.dataTableLabel')}
                    columns={visibleTableColumns}
                    density={density}
                    emptyContent={t('uiElements.dataTableEmpty')}
                    rows={tableMode === 'empty' ? [] : visibleTableRows}
                    selection={
                      tableMode === 'multiple'
                        ? {
                            mode: 'multiple',
                            selectedIds: selectedTableIds,
                            onSelectionChange: setSelectedTableIds,
                          }
                        : {
                            ...(tableMode === 'empty' ? {} : { selectedId: selectedTableId }),
                            onSelectionChange: setSelectedTableId,
                          }
                    }
                    sort={{
                      ...tableSort,
                      onSortChange: (columnId, direction) =>
                        setTableSort({ columnId, direction }),
                    }}
                  />
                </div>
              </ComponentPreview>
            </div>
          </Section>
        </>
      )}
    </UiElementsFamilyPage>
  );
}
