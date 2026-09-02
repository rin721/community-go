'use client';

import {
  createReferenceSnapshot,
  filterReferenceRecords,
  getReferenceRecords,
  type ReferenceRecord,
  type ReferenceStatus,
} from '../../../reference/reference-scenarios';
import { Action } from '@community-go/ui-adapter/action';
import { AsyncRegion } from '@community-go/ui-adapter/async-region';
import { BusyIndicator } from '@community-go/ui-adapter/busy-indicator';
import { DataTable, TabsView, type DataColumn } from '@community-go/ui-adapter/data-display';
import { DescriptionList } from '@community-go/ui-adapter/description-list';
import { useFeedback } from '@community-go/ui-adapter/feedback-context';
import { SelectField } from '@community-go/ui-adapter/form-field';
import { UserIdentity } from '@community-go/ui-adapter/identity';
import { PaginationControl } from '@community-go/ui-adapter/navigation';
import { DialogSurface, DrawerSurface } from '@community-go/ui-adapter/overlays';
import { Panel } from '@community-go/ui-adapter/panel';
import { ProgressMeter } from '@community-go/ui-adapter/progress-meter';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { Skeleton } from '@community-go/ui-adapter/skeleton';
import { StateSurface } from '@community-go/ui-adapter/state-surface';
import { StatusPill, type StatusTone } from '@community-go/ui-adapter/status-pill';
import {
  AlertTriangle,
  CloudOff,
  Download,
  FileWarning,
  Filter,
  Inbox,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDate, useFrontendTranslation } from '@community-go/i18n';

import { browserReferenceExport } from '../../../host/browser-reference-export';
import {
  AdminFilterBar,
  AdminPageHeader,
  AdminPage,
  AdminSection,
  AdminSectionBody,
  AdminToolbar,
  AdminSplitView,
} from '@community-go/admin-foundation/layout';
import { useShellStore } from '../../../state/use-shell-store';

type SceneMode =
  | 'ready'
  | 'loading'
  | 'refreshing'
  | 'background'
  | 'empty'
  | 'partial-error'
  | 'offline'
  | 'permission';

const records = getReferenceRecords();
const pageSize = 12;

const statusTone: Record<ReferenceStatus, StatusTone> = {
  healthy: 'success',
  attention: 'warning',
  paused: 'neutral',
};

export default function ReferenceWorkspacePage() {
  const { t } = useFrontendTranslation();
  const { notify } = useFeedback();
  const locale = useShellStore((state) => state.locale);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ReferenceStatus | 'all'>('all');
  const [region, setRegion] = useState<ReferenceRecord['region'] | 'all'>('all');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [sceneMode, setSceneMode] = useState<SceneMode>('ready');
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? '');
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{
    columnId: string;
    direction: 'ascending' | 'descending';
  }>({ columnId: 'updated', direction: 'descending' });
  const [exported, setExported] = useState(false);

  const filteredRecords = useMemo(
    () => filterReferenceRecords(records, { query, status, region }),
    [query, region, status],
  );
  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ?? filteredRecords[0];

  const sortedRecords = useMemo(() => {
    const direction = sort.direction === 'ascending' ? 1 : -1;
    return [...filteredRecords].sort((left, right) => {
      const leftValue =
        sort.columnId === 'workstream'
          ? left.name
          : sort.columnId === 'progress'
            ? left.completionPercent
            : sort.columnId === 'updated'
              ? left.updatedAt
              : left[sort.columnId as 'owner' | 'status' | 'region'];
      const rightValue =
        sort.columnId === 'workstream'
          ? right.name
          : sort.columnId === 'progress'
            ? right.completionPercent
            : sort.columnId === 'updated'
              ? right.updatedAt
              : right[sort.columnId as 'owner' | 'status' | 'region'];
      return (
        String(leftValue).localeCompare(String(rightValue), locale, { numeric: true }) * direction
      );
    });
  }, [filteredRecords, locale, sort]);

  const columns = useMemo<readonly DataColumn<ReferenceRecord>[]>(
    () => [
      {
        id: 'workstream',
        label: t('reference.columns.workstream'),
        rowHeader: true,
        sortable: true,
        render: (record) => (
          <div className="min-w-48">
            <p className="font-semibold text-ink">{record.name}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{record.id}</p>
          </div>
        ),
      },
      {
        id: 'owner',
        label: t('reference.columns.owner'),
        sortable: true,
        render: (record) => (
          <UserIdentity
            avatarSize="sm"
            description={t(`reference.region.${record.region}`)}
            name={record.owner}
          />
        ),
      },
      {
        id: 'status',
        label: t('reference.columns.status'),
        sortable: true,
        render: (record) => (
          <StatusPill tone={statusTone[record.status]}>
            {t(`reference.status.${record.status}`)}
          </StatusPill>
        ),
      },
      {
        id: 'region',
        label: t('reference.columns.region'),
        sortable: true,
        render: (record) => t(`reference.region.${record.region}`),
      },
      {
        id: 'progress',
        label: t('reference.columns.progress'),
        sortable: true,
        render: (record) => (
          <div className="min-w-32">
            <ProgressMeter
              label={`${record.completionPercent}%`}
              value={record.completionPercent}
            />
          </div>
        ),
      },
      {
        id: 'updated',
        label: t('reference.columns.updated'),
        sortable: true,
        render: (record) =>
          formatDate(locale, record.updatedAt, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
      },
    ],
    [locale, t],
  );

  const visibleRecords = sceneMode === 'empty' ? [] : sortedRecords;
  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRecords = visibleRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  // sceneMode → AsyncRegion 阶段映射：首次加载、保留内容刷新、后台刷新与替换状态分轨。
  const asyncPhase =
    sceneMode === 'loading'
      ? 'initial'
      : sceneMode === 'refreshing'
        ? 'refreshing'
        : sceneMode === 'background'
          ? 'background'
          : sceneMode === 'empty'
            ? 'empty'
            : sceneMode === 'offline' || sceneMode === 'permission'
              ? 'error'
              : 'ready';

  const metrics = [
    { label: t('reference.metrics.total'), value: String(records.length), tone: 'text-brand' },
    {
      label: t('reference.metrics.attention'),
      value: String(records.filter((record) => record.status === 'attention').length),
      tone: 'text-warning',
    },
    {
      label: t('reference.metrics.highRisk'),
      value: String(records.filter((record) => record.risk === 'high').length),
      tone: 'text-danger',
    },
    {
      label: t('reference.metrics.filtered'),
      value: String(filteredRecords.length),
      tone: 'text-info',
    },
  ] as const;

  const exportSnapshot = async () => {
    await browserReferenceExport.exportTextFile(
      'frontend-reference-snapshot.json',
      createReferenceSnapshot(filteredRecords),
    );
    setExported(true);
    notify({
      title: t('reference.exported'),
      description: t('reference.tableDescription', { count: filteredRecords.length }),
      tone: 'success',
    });
  };

  const exportSelected = async () => {
    const selectedRecords = records.filter((record) => selectedIds.includes(record.id));
    await browserReferenceExport.exportTextFile(
      'frontend-reference-snapshot.json',
      createReferenceSnapshot(selectedRecords),
    );
    setExported(true);
    notify({
      title: t('reference.exported'),
      description: t('reference.selectedCount', { count: selectedRecords.length }),
      tone: 'success',
    });
  };

  return (
    <AdminPage>
      <AdminPageHeader
        breadcrumbLabel={t('layout.breadcrumb')}
        breadcrumbs={[
          { label: t('reference.breadcrumbRoot') },
          { label: t('reference.breadcrumbCurrent'), current: true },
        ]}
        eyebrow={t('reference.eyebrow')}
        title={t('reference.title')}
        description={t('reference.description')}
        actions={
          <>
            <DrawerSurface
              triggerLabel={t('reference.openDrawer')}
              title={t('reference.drawerTitle')}
              description={t('reference.drawerDescription')}
              closeLabel={t('reference.close')}
            >
              <div className="space-y-4">
                {records.slice(0, 8).map((record) => (
                  <div className="rounded-control bg-surface-muted p-3" key={record.id}>
                    <p className="text-sm font-semibold text-ink">{record.name}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">{record.description}</p>
                  </div>
                ))}
              </div>
            </DrawerSurface>
            <DialogSurface
              triggerLabel={t('reference.openDialog')}
              title={t('reference.dialogTitle')}
              description={t('reference.dialogDescription')}
              cancelLabel={t('reference.cancel')}
              confirmLabel={t('reference.confirm')}
              onConfirm={() => setExported(true)}
            >
              <p className="text-sm leading-6 text-ink-muted">{t('reference.dialogBody')}</p>
            </DialogSurface>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Panel className="p-5" key={metric.label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {metric.label}
            </p>
            <p className={`mt-3 text-3xl font-extrabold ${metric.tone}`}>{metric.value}</p>
          </Panel>
        ))}
      </div>

      <AdminToolbar
        label={t('layout.toolbar')}
        primary={
          <div className="min-w-64 flex-1">
            <SearchBox
              label={t('reference.searchLabel')}
              placeholder={t('reference.searchPlaceholder')}
              value={query}
              onValueChange={setQuery}
            />
          </div>
        }
        secondary={
          <>
            {exported ? <StatusPill tone="success">{t('reference.exported')}</StatusPill> : null}
            <Action
              size="sm"
              variant="secondary"
              leadingIcon={<Download className="size-4" />}
              onPress={() => void exportSnapshot()}
            >
              {t('reference.export')}
            </Action>
          </>
        }
      />

      <AdminFilterBar>
        <SelectField
          label={t('reference.statusLabel')}
          value={status}
          options={[
            { value: 'all', label: t('reference.all') },
            { value: 'healthy', label: t('reference.status.healthy') },
            { value: 'attention', label: t('reference.status.attention') },
            { value: 'paused', label: t('reference.status.paused') },
          ]}
          onValueChange={(value) => {
            setStatus(value as ReferenceStatus | 'all');
            setPage(1);
          }}
        />
        <SelectField
          label={t('reference.regionLabel')}
          value={region}
          options={[
            { value: 'all', label: t('reference.all') },
            { value: 'apac', label: t('reference.region.apac') },
            { value: 'emea', label: t('reference.region.emea') },
            { value: 'americas', label: t('reference.region.americas') },
          ]}
          onValueChange={(value) => {
            setRegion(value as ReferenceRecord['region'] | 'all');
            setPage(1);
          }}
        />
        <SelectField
          label={t('reference.densityLabel')}
          value={density}
          options={[
            { value: 'comfortable', label: t('reference.comfortable') },
            { value: 'compact', label: t('reference.compact') },
          ]}
          onValueChange={(value) => setDensity(value as 'comfortable' | 'compact')}
        />
        <SelectField
          label={t('reference.sceneModeLabel')}
          value={sceneMode}
          options={[
            { value: 'ready', label: t('reference.sceneMode.ready') },
            { value: 'loading', label: t('reference.sceneMode.loading') },
            { value: 'refreshing', label: t('reference.sceneMode.refreshing') },
            { value: 'background', label: t('reference.sceneMode.background') },
            { value: 'empty', label: t('reference.sceneMode.empty') },
            { value: 'partial-error', label: t('reference.sceneMode.partialError') },
            { value: 'offline', label: t('reference.sceneMode.offline') },
            { value: 'permission', label: t('reference.sceneMode.permission') },
          ]}
          onValueChange={(value) => setSceneMode(value as SceneMode)}
        />
      </AdminFilterBar>

      {sceneMode === 'partial-error' ? (
        <div className="flex items-start gap-3 rounded-panel border border-warning/30 bg-warning-soft p-4 text-warning">
          <FileWarning className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">{t('reference.partialErrorTitle')}</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              {t('reference.partialErrorDescription')}
            </p>
          </div>
        </div>
      ) : null}

      <AsyncRegion
        label={t('reference.tableLabel')}
        phase={asyncPhase}
        loading={
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        }
        refreshing={
          <div className="mb-3 flex items-center gap-2 rounded-control bg-info-soft px-3 py-2 text-sm text-info">
            <BusyIndicator label={t('reference.sceneMode.refreshing')} />
            <span>{t('reference.sceneMode.refreshing')}</span>
          </div>
        }
        empty={
          <Panel>
            <StateSurface
              compact
              state="empty"
              icon={<Inbox className="size-5" />}
              title={t('reference.emptyTitle')}
              description={t('reference.emptyDescription')}
              actionLabel={t('reference.clearFilters')}
              onAction={() => {
                setQuery('');
                setStatus('all');
                setRegion('all');
                setSceneMode('ready');
              }}
            />
          </Panel>
        }
        error={
          sceneMode === 'offline' || sceneMode === 'permission' ? (
            <Panel>
              <StateSurface
                state={sceneMode === 'offline' ? 'offline' : 'permission-denied'}
                icon={
                  sceneMode === 'offline' ? (
                    <CloudOff className="size-5" />
                  ) : (
                    <LockKeyhole className="size-5" />
                  )
                }
                title={t(`reference.${sceneMode}Title`)}
                description={t(`reference.${sceneMode}Description`)}
                actionLabel={t('reference.retry')}
                onAction={() => setSceneMode('ready')}
              />
            </Panel>
          ) : null
        }
      >
        <AdminSplitView
          master={
            <AdminSection
              title={t('reference.tableTitle')}
              description={t('reference.tableDescription', { count: visibleRecords.length })}
              action={<Filter className="size-4 text-ink-muted" />}
            >
              <>
                {selectedIds.length > 0 ? (
                  <div className="flex items-center justify-between gap-3 border-b border-border bg-brand-soft px-4 py-3">
                    <span className="text-sm font-semibold text-brand">
                      {t('reference.selectedCount', { count: selectedIds.length })}
                    </span>
                    <Action size="sm" variant="secondary" onPress={() => void exportSelected()}>
                      {t('reference.exportSelected')}
                    </Action>
                  </div>
                ) : null}
                <DataTable
                  label={t('reference.tableLabel')}
                  columns={columns}
                  density={density}
                  emptyContent={t('reference.emptyDescription')}
                  rows={pageRecords}
                  selection={{
                    mode: 'multiple',
                    selectedIds,
                    onSelectionChange: (ids) => {
                      setSelectedIds(ids);
                      const latestId = ids.at(-1);
                      if (latestId) setSelectedId(latestId);
                    },
                  }}
                  sort={{
                    ...sort,
                    onSortChange: (columnId, direction) => {
                      setSort({ columnId, direction });
                      setPage(1);
                    },
                  }}
                />
                <div className="flex justify-end border-t border-border p-4">
                  <PaginationControl
                    getPageLabel={(pageNumber) => t('reference.pageLabel', { page: pageNumber })}
                    label={t('reference.paginationLabel')}
                    nextLabel={t('reference.nextPage')}
                    onPageChange={setPage}
                    page={currentPage}
                    previousLabel={t('reference.previousPage')}
                    totalPages={totalPages}
                  />
                </div>
              </>
            </AdminSection>
          }
          detail={
            <Panel className="overflow-hidden">
              {selectedRecord ? (
                <>
                  <div className="border-b border-border p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand">
                          {selectedRecord.id}
                        </p>
                        <h2 className="mt-2 text-lg font-bold text-ink">{selectedRecord.name}</h2>
                      </div>
                      <StatusPill tone={statusTone[selectedRecord.status]}>
                        {t(`reference.status.${selectedRecord.status}`)}
                      </StatusPill>
                    </div>
                  </div>
                  <AdminSectionBody>
                    <TabsView
                      label={t('reference.detailTabsLabel')}
                      variant="section"
                      items={[
                        {
                          id: 'summary',
                          label: t('reference.tabs.summary'),
                          content: (
                            <div className="space-y-5 text-sm leading-6 text-ink-muted">
                              <p>{selectedRecord.description}</p>
                              <DescriptionList
                                label={t('reference.detailTabsLabel')}
                                items={[
                                  {
                                    id: 'owner',
                                    term: t('reference.columns.owner'),
                                    description: (
                                      <UserIdentity
                                        description={t(`reference.region.${selectedRecord.region}`)}
                                        name={selectedRecord.owner}
                                      />
                                    ),
                                  },
                                  {
                                    id: 'updated',
                                    term: t('reference.columns.updated'),
                                    description: formatDate(locale, selectedRecord.updatedAt, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    }),
                                  },
                                ]}
                              />
                            </div>
                          ),
                        },
                        {
                          id: 'activity',
                          label: t('reference.tabs.activity'),
                          content: (
                            <ol className="space-y-3">
                              {[0, 1, 2].map((item) => (
                                <li className="flex gap-3 text-sm" key={item}>
                                  <RefreshCw className="mt-0.5 size-4 shrink-0 text-info" />
                                  <span className="leading-6 text-ink-muted">
                                    {t('reference.activityItem', { number: item + 1 })}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          ),
                        },
                        {
                          id: 'risk',
                          label: t('reference.tabs.risk'),
                          content: (
                            <div className="flex gap-3 rounded-control bg-warning-soft p-3 text-warning">
                              <AlertTriangle className="size-4 shrink-0" />
                              <p className="text-sm leading-6">{t('reference.riskDescription')}</p>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </AdminSectionBody>
                </>
              ) : null}
            </Panel>
          }
        />
      </AsyncRegion>
    </AdminPage>
  );
}
