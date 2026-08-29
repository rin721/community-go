import {
  createReferenceFeature,
  filterReferenceRecords,
  getReferenceRecords,
  type ReferenceRecord,
  type ReferenceStatus,
} from '@community-go/reference';
import {
  Action,
  DataTable,
  DialogSurface,
  DrawerSurface,
  Panel,
  ProgressMeter,
  SearchBox,
  SelectField,
  Skeleton,
  StateSurface,
  StatusPill,
  TabsView,
  type DataColumn,
  type StatusTone,
} from '@community-go/ui-adapter';
import {
  AlertTriangle,
  ArrowUpRight,
  CloudOff,
  Download,
  FileWarning,
  Filter,
  Inbox,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { browserReferenceExport } from '../../host/browser-reference-export';
import {
  PageFilterBar,
  PageHeader,
  PageLayout,
  PageSection,
  PageToolbar,
  SplitView,
} from '../../layouts/page-layout';
import { useShellStore } from '../../state/use-shell-store';

type SceneMode = 'ready' | 'loading' | 'empty' | 'partial-error' | 'offline' | 'permission';

const records = getReferenceRecords();
const referenceFeature = createReferenceFeature(browserReferenceExport);

const statusTone: Record<ReferenceStatus, StatusTone> = {
  healthy: 'success',
  attention: 'warning',
  paused: 'neutral',
};

export function ReferenceWorkspaceScreen() {
  const { t } = useTranslation();
  const locale = useShellStore((state) => state.locale);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ReferenceStatus | 'all'>('all');
  const [region, setRegion] = useState<ReferenceRecord['region'] | 'all'>('all');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [sceneMode, setSceneMode] = useState<SceneMode>('ready');
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? '');
  const [exported, setExported] = useState(false);

  const filteredRecords = useMemo(
    () => filterReferenceRecords(records, { query, status, region }),
    [query, region, status],
  );
  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ?? filteredRecords[0];

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
    [locale],
  );

  const columns = useMemo<readonly DataColumn<ReferenceRecord>[]>(
    () => [
      {
        id: 'workstream',
        label: t('reference.columns.workstream'),
        rowHeader: true,
        render: (record) => (
          <div className="min-w-48">
            <p className="font-semibold text-ink">{record.name}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{record.id}</p>
          </div>
        ),
      },
      { id: 'owner', label: t('reference.columns.owner'), render: (record) => record.owner },
      {
        id: 'status',
        label: t('reference.columns.status'),
        render: (record) => (
          <StatusPill tone={statusTone[record.status]}>
            {t(`reference.status.${record.status}`)}
          </StatusPill>
        ),
      },
      {
        id: 'region',
        label: t('reference.columns.region'),
        render: (record) => t(`reference.region.${record.region}`),
      },
      {
        id: 'progress',
        label: t('reference.columns.progress'),
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
        render: (record) => dateFormatter.format(new Date(record.updatedAt)),
      },
    ],
    [dateFormatter, t],
  );

  const visibleRecords = sceneMode === 'empty' ? [] : filteredRecords;
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
    await referenceFeature.exportSnapshot(filteredRecords);
    setExported(true);
  };

  return (
    <PageLayout>
      <PageHeader
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

      <PageToolbar
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

      <PageFilterBar>
        <SelectField
          label={t('reference.statusLabel')}
          value={status}
          options={[
            { value: 'all', label: t('reference.all') },
            { value: 'healthy', label: t('reference.status.healthy') },
            { value: 'attention', label: t('reference.status.attention') },
            { value: 'paused', label: t('reference.status.paused') },
          ]}
          onValueChange={(value) => setStatus(value as ReferenceStatus | 'all')}
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
          onValueChange={(value) => setRegion(value as ReferenceRecord['region'] | 'all')}
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
            { value: 'empty', label: t('reference.sceneMode.empty') },
            { value: 'partial-error', label: t('reference.sceneMode.partialError') },
            { value: 'offline', label: t('reference.sceneMode.offline') },
            { value: 'permission', label: t('reference.sceneMode.permission') },
          ]}
          onValueChange={(value) => setSceneMode(value as SceneMode)}
        />
      </PageFilterBar>

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

      {sceneMode === 'offline' || sceneMode === 'permission' ? (
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
      ) : (
        <SplitView
          master={
            <PageSection
              title={t('reference.tableTitle')}
              description={t('reference.tableDescription', { count: visibleRecords.length })}
              action={<Filter className="size-4 text-ink-muted" />}
            >
              {sceneMode === 'loading' ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 8 }, (_, index) => (
                    <Skeleton className="h-12 w-full" key={index} />
                  ))}
                </div>
              ) : visibleRecords.length === 0 ? (
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
              ) : (
                <DataTable
                  label={t('reference.tableLabel')}
                  columns={columns}
                  density={density}
                  rows={visibleRecords}
                  onRowAction={setSelectedId}
                  {...(selectedRecord ? { selectedId: selectedRecord.id } : {})}
                />
              )}
            </PageSection>
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
                  <TabsView
                    label={t('reference.detailTabsLabel')}
                    items={[
                      {
                        id: 'summary',
                        label: t('reference.tabs.summary'),
                        content: (
                          <div className="space-y-4 p-5 text-sm leading-6 text-ink-muted">
                            <p>{selectedRecord.description}</p>
                            <div className="rounded-control bg-surface-muted p-3">
                              <p className="text-xs font-semibold text-ink-muted">
                                {t('reference.columns.owner')}
                              </p>
                              <p className="mt-1 font-bold text-ink">{selectedRecord.owner}</p>
                            </div>
                          </div>
                        ),
                      },
                      {
                        id: 'activity',
                        label: t('reference.tabs.activity'),
                        content: (
                          <ol className="space-y-3 p-5">
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
                          <div className="p-5">
                            <div className="flex gap-3 rounded-control bg-warning-soft p-3 text-warning">
                              <AlertTriangle className="size-4 shrink-0" />
                              <p className="text-sm leading-6">{t('reference.riskDescription')}</p>
                            </div>
                          </div>
                        ),
                      },
                    ]}
                  />
                  <div className="border-t border-border p-4">
                    <Action
                      fullWidth
                      size="sm"
                      variant="secondary"
                      leadingIcon={<ArrowUpRight className="size-4" />}
                    >
                      {t('reference.detailAction')}
                    </Action>
                  </div>
                </>
              ) : null}
            </Panel>
          }
        />
      )}
    </PageLayout>
  );
}
