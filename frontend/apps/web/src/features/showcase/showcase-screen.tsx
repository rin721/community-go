import {
  Action,
  AlertBanner,
  Avatar,
  Badge,
  BreadcrumbTrail,
  BusyIndicator,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CheckboxField,
  ComboField,
  CommandMenu,
  ConfirmDialog,
  DatePickerField,
  DataTable,
  DestructiveConfirmDialog,
  DescriptionList,
  DialogSurface,
  DrawerSurface,
  IconAction,
  MenuButton,
  NotificationCard,
  Panel,
  PaginationControl,
  PopoverCard,
  ProgressMeter,
  RadioGroupField,
  SearchBox,
  SelectField,
  Skeleton,
  StateSurface,
  StatusPill,
  SwitchField,
  TabsView,
  TextAreaField,
  TextField,
  TextLink,
  TooltipAction,
  ToggleGroup,
  UserIdentity,
  useFeedback,
  type DataColumn,
} from '@community-go/ui-adapter';
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckCircle2,
  ChevronRight,
  Copy,
  Grid2X2,
  Inbox,
  Info,
  LayoutList,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { PageHeader, PageLayout, PageSection } from '../../layouts/page-layout';
import { useShellStore } from '../../state/use-shell-store';
import avatarDemoUrl from '../../assets/avatar-demo.svg';
import { ComponentPreview } from './component-preview';

const ownerOptions = [
  'Lin Chen',
  'Avery Morgan',
  'Mika Sato',
  'Noah Williams',
  'Sofia Rossi',
  'Amara Okafor',
  'Mateo Garcia',
  'Lea Dubois',
  'Omar Haddad',
  'Priya Shah',
  'Jonas Berg',
  'Nora Jensen',
  'Kai Müller',
  'Mei Tanaka',
] as const;

const showcaseProgressValue = 64;

type ShowcaseDataRow = Readonly<{
  id: string;
  element: string;
  owner: string;
  status: string;
  tone: 'success' | 'warning' | 'info';
}>;

export function ShowcaseScreen() {
  const { t } = useTranslation();
  const { notify } = useFeedback();
  const [searchParams] = useSearchParams();
  const overlay = searchParams.get('overlay');
  const locale = useShellStore((state) => state.locale);
  const setLocale = useShellStore((state) => state.setLocale);
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    searchParams.get('density') === 'compact' ? 'compact' : 'comfortable',
  );
  const [longText, setLongText] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(true);
  const [alertVisible, setAlertVisible] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState('UI-001');
  const [selectedTableIds, setSelectedTableIds] = useState<readonly string[]>([]);
  const [tableMode, setTableMode] = useState<'single' | 'multiple' | 'empty'>(
    searchParams.get('data') === 'empty' ? 'empty' : 'single',
  );
  const [tableSort, setTableSort] = useState<{
    columnId: string;
    direction: 'ascending' | 'descending';
  }>({ columnId: 'element', direction: 'descending' });
  const [checked, setChecked] = useState(true);
  const [selected, setSelected] = useState('guided');
  const [searchValue, setSearchValue] = useState('UI');
  const [contentTab, setContentTab] = useState('overview');
  const [viewModes, setViewModes] = useState<readonly string[]>(['grid']);
  const [visibleColumns, setVisibleColumns] = useState<readonly string[]>(['owner', 'status']);
  const [page, setPage] = useState(2);
  const [lastAction, setLastAction] = useState<string>();
  const directToastSent = useRef(false);
  const description = longText ? t('showcase.longDescription') : t('showcase.shortDescription');
  const spacing = density === 'compact' ? 'gap-2' : 'gap-4';
  const catalogFamilies = [
    { id: 'actions', label: t('showcase.catalog.actions'), count: 3 },
    { id: 'feedback', label: t('showcase.catalog.feedback'), count: 4 },
    { id: 'status-async', label: t('showcase.catalog.statusAsync'), count: 5 },
    { id: 'identity-display', label: t('showcase.catalog.identityDisplay'), count: 3 },
    { id: 'navigation', label: t('showcase.catalog.navigation'), count: 4 },
    { id: 'data', label: t('showcase.catalog.data'), count: 1 },
    { id: 'surfaces', label: t('showcase.catalog.surfaces'), count: 2 },
    { id: 'forms', label: t('showcase.catalog.forms'), count: 9 },
    { id: 'overlays', label: t('showcase.catalog.overlays'), count: 8 },
  ] as const;

  useEffect(() => {
    if (overlay !== 'toast' || directToastSent.current) return;
    directToastSent.current = true;
    notify({
      title: t('showcase.toastTitle'),
      description: t('showcase.toastDescription'),
      tone: 'info',
    });
  }, [notify, overlay, t]);
  const tableRows: readonly ShowcaseDataRow[] = [
    {
      id: 'UI-001',
      element: t('showcase.dataTableRows.tokens'),
      owner: t('showcase.dataTableOwners.foundation'),
      status: t('showcase.dataTableStatus.ready'),
      tone: 'success',
    },
    {
      id: 'UI-002',
      element: t('showcase.dataTableRows.formControl'),
      owner: t('showcase.dataTableOwners.interaction'),
      status: t('showcase.dataTableStatus.review'),
      tone: 'warning',
    },
    {
      id: 'UI-003',
      element: t('showcase.dataTableRows.overlaySurface'),
      owner: t('showcase.dataTableOwners.composition'),
      status: t('showcase.dataTableStatus.verified'),
      tone: 'info',
    },
  ];
  const tableColumns: readonly DataColumn<ShowcaseDataRow>[] = [
    {
      id: 'element',
      label: t('showcase.dataTableColumns.element'),
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
      label: t('showcase.dataTableColumns.owner'),
      sortable: true,
      render: (row) => row.owner,
    },
    {
      id: 'status',
      label: t('showcase.dataTableColumns.status'),
      render: (row) => <StatusPill tone={row.tone}>{row.status}</StatusPill>,
    },
  ];
  const visibleTableColumns = tableColumns.filter(
    (column) => column.id === 'element' || visibleColumns.includes(column.id),
  );
  const visibleTableRows = [...tableRows].sort((left, right) => {
    const leftValue = String(left[tableSort.columnId as keyof ShowcaseDataRow]);
    const rightValue = String(right[tableSort.columnId as keyof ShowcaseDataRow]);
    const result = leftValue.localeCompare(rightValue, locale);
    return tableSort.direction === 'ascending' ? result : -result;
  });

  return (
    <PageLayout>
      <PageHeader
        breadcrumbLabel={t('layout.breadcrumb')}
        breadcrumbs={[
          { label: t('showcase.breadcrumbRoot') },
          { label: t('showcase.breadcrumbCurrent'), current: true },
        ]}
        eyebrow={t('showcase.eyebrow')}
        title={t('showcase.title')}
        description={t('showcase.description')}
      />

      <Panel className="grid gap-4 p-4 md:grid-cols-3">
        <SelectField
          label={t('showcase.density')}
          options={[
            { value: 'comfortable', label: t('showcase.comfortable') },
            { value: 'compact', label: t('showcase.compact') },
          ]}
          value={density}
          onValueChange={(value) => setDensity(value as 'comfortable' | 'compact')}
        />
        <SwitchField
          label={t('showcase.longText')}
          description={t('showcase.longTextDescription')}
          checked={longText}
          onCheckedChange={setLongText}
        />
        <SwitchField
          label={t('showcase.locale')}
          description={t('showcase.localeDescription')}
          checked={locale === 'en'}
          onCheckedChange={(enabled) => setLocale(enabled ? 'en' : 'zh-CN')}
        />
      </Panel>

      <Panel aria-label={t('showcase.catalog.label')} className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              {t('showcase.catalog.kicker')}
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-ink">{t('showcase.catalog.title')}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {t('showcase.catalog.description')}
            </p>
          </div>
          <Badge appearance="solid" tone="info" size="md">
            {t('showcase.catalog.total', { count: 39 })}
          </Badge>
        </div>
        <nav aria-label={t('showcase.catalog.label')} className="mt-5 flex flex-wrap gap-2">
          {catalogFamilies.map((family) => (
            <TextLink href={`#${family.id}`} key={family.id} trailingIcon={<ChevronRight />}>
              {family.label} · {family.count}
            </TextLink>
          ))}
        </nav>
      </Panel>

      <PageSection id="actions" title={t('showcase.actionsTitle')} description={description}>
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <ComponentPreview
            fullWidth
            name="Action"
            description={t('showcase.catalog.actionDescription')}
            states={[
              'Primary',
              'Secondary',
              'Quiet',
              'Danger',
              'sm / md / lg',
              'Icon',
              'Pending',
              'Disabled',
            ]}
          >
            <div className={`flex flex-wrap items-center ${spacing}`}>
              <Action
                leadingIcon={<CheckCircle2 />}
                onPress={() => setLastAction(t('showcase.primary'))}
              >
                {t('showcase.primary')}
              </Action>
              <Action
                trailingIcon={<ChevronRight />}
                variant="secondary"
                onPress={() => setLastAction(t('showcase.secondary'))}
              >
                {t('showcase.secondary')}
              </Action>
              <Action variant="quiet" onPress={() => setLastAction(t('showcase.quiet'))}>
                {t('showcase.quiet')}
              </Action>
              <Action variant="danger" onPress={() => setLastAction(t('showcase.danger'))}>
                {t('showcase.danger')}
              </Action>
              <Action size="sm" onPress={() => setLastAction(t('showcase.small'))}>
                {t('showcase.small')}
              </Action>
              <Action size="lg" onPress={() => setLastAction(t('showcase.catalog.large'))}>
                {t('showcase.catalog.large')}
              </Action>
              <Action loading disabled>
                {t('showcase.loading')}
              </Action>
              <Action disabled>{t('showcase.disabled')}</Action>
            </div>
            {lastAction ? (
              <p className="mt-4 text-sm text-ink-muted" role="status">
                {t('showcase.catalog.lastAction', { action: lastAction })}
              </p>
            ) : null}
          </ComponentPreview>
          <ComponentPreview
            name="IconAction"
            description={t('showcase.catalog.iconActionDescription')}
            states={['sm / md', 'Active', 'Danger', 'Pending', 'Disabled', 'Accessible name']}
          >
            <div className="flex flex-wrap items-center gap-3">
              <IconAction
                label={t('showcase.catalog.search')}
                onPress={() => setLastAction('Search')}
              >
                <Search className="size-icon-sm" />
              </IconAction>
              <IconAction
                active
                label={t('showcase.catalog.refresh')}
                onPress={() => setLastAction('Refresh')}
              >
                <RefreshCw className="size-icon-sm" />
              </IconAction>
              <IconAction
                label={t('showcase.catalog.delete')}
                tone="danger"
                onPress={() => setLastAction('Delete')}
              >
                <Trash2 className="size-icon-sm" />
              </IconAction>
              <IconAction
                label={t('showcase.catalog.more')}
                size="sm"
                onPress={() => setLastAction('More')}
              >
                <MoreHorizontal className="size-icon-sm" />
              </IconAction>
              <IconAction disabled loading label={t('showcase.catalog.refreshing')}>
                <RefreshCw className="size-icon-sm" />
              </IconAction>
              <IconAction disabled label={t('showcase.catalog.moreDisabled')}>
                <MoreHorizontal className="size-icon-sm" />
              </IconAction>
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="ToggleGroup"
            description={t('showcase.catalog.toggleDescription')}
            states={['Single', 'Multiple', 'Selected', 'Disabled item', 'sm / md', 'Icon']}
          >
            <div className="grid gap-5">
              <ToggleGroup
                label={t('showcase.catalog.viewMode')}
                options={[
                  { id: 'grid', label: t('showcase.catalog.grid'), icon: <Grid2X2 /> },
                  { id: 'list', label: t('showcase.catalog.list'), icon: <LayoutList /> },
                  { id: 'locked', label: t('showcase.catalog.locked'), disabled: true },
                ]}
                selectedIds={viewModes}
                onSelectionChange={setViewModes}
                selectionMode="single"
              />
              <ToggleGroup
                label={t('showcase.catalog.visibleColumns')}
                options={[
                  { id: 'owner', label: t('showcase.dataTableColumns.owner') },
                  { id: 'status', label: t('showcase.dataTableColumns.status') },
                ]}
                selectedIds={visibleColumns}
                onSelectionChange={setVisibleColumns}
                selectionMode="multiple"
                size="sm"
              />
            </div>
          </ComponentPreview>
        </div>
      </PageSection>

      <PageSection
        id="feedback"
        title={t('showcase.feedbackTitle')}
        description={t('showcase.feedbackDescription')}
      >
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <ComponentPreview
            fullWidth
            name="AlertBanner"
            description={t('showcase.catalog.alertDescription')}
            states={['Info', 'Success', 'Warning', 'Danger', 'Action', 'Dismiss', 'Announcement']}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {alertVisible ? (
                <AlertBanner
                  tone="success"
                  icon={<CheckCircle2 className="size-5" />}
                  title={t('showcase.successAlertTitle')}
                  description={description}
                  dismissLabel={t('showcase.alertDismiss')}
                  onDismiss={() => setAlertVisible(false)}
                />
              ) : (
                <Action variant="quiet" onPress={() => setAlertVisible(true)}>
                  {t('showcase.alertRestore')}
                </Action>
              )}
              <AlertBanner
                tone="warning"
                icon={<AlertTriangle className="size-5" />}
                title={t('showcase.warningAlertTitle')}
                description={t('showcase.warningAlertDescription')}
                actionLabel={t('showcase.reviewAction')}
                onAction={() => setLongText(true)}
              />
              <AlertBanner
                tone="info"
                icon={<Info className="size-5" />}
                title={t('showcase.catalog.infoAlertTitle')}
                description={description}
              />
              <AlertBanner
                tone="danger"
                icon={<XCircle className="size-5" />}
                title={t('showcase.catalog.dangerAlertTitle')}
                description={t('showcase.catalog.dangerAlertDescription')}
                announcement="urgent"
              />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="Badge"
            description={t('showcase.catalog.badgeDescription')}
            states={[
              'Soft',
              'Solid',
              'sm / md',
              '5 tones',
              'Leading / trailing icon',
              'Long content',
            ]}
          >
            <div className="flex flex-wrap gap-2" aria-label={t('showcase.badgesLabel')}>
              <Badge leadingIcon={<CheckCircle2 className="size-3.5" />} tone="success">
                {t('showcase.successStatus')}
              </Badge>
              <Badge tone="warning">{t('showcase.warningStatus')}</Badge>
              <Badge tone="danger" appearance="solid">
                {t('showcase.dangerStatus')}
              </Badge>
              <Badge tone="info" appearance="solid" size="md">
                {t('showcase.infoStatus')}
              </Badge>
              <Badge trailingIcon={<ChevronRight className="size-3.5" />}>
                {longText ? t('showcase.longDescription') : t('showcase.defaultStatus')}
              </Badge>
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="NotificationCard"
            description={t('showcase.catalog.notificationDescription')}
            states={['Primary action', 'Secondary action', 'Dismiss', 'Long content']}
          >
            {notificationVisible ? (
              <NotificationCard
                icon={<Bell className="size-5" />}
                title={t('showcase.notificationTitle')}
                description={t('showcase.notificationDescription')}
                primaryActionLabel={t('showcase.notificationPrimary')}
                secondaryActionLabel={t('showcase.notificationSecondary')}
                dismissLabel={t('showcase.notificationDismiss')}
                onPrimaryAction={() => setLongText(true)}
                onSecondaryAction={() => setNotificationVisible(false)}
                onDismiss={() => setNotificationVisible(false)}
              />
            ) : (
              <AlertBanner
                tone="info"
                icon={<Bell className="size-5" />}
                title={t('showcase.notificationDismissedTitle')}
                description={t('showcase.notificationDismissedDescription')}
                actionLabel={t('showcase.notificationRestore')}
                onAction={() => setNotificationVisible(true)}
              />
            )}
          </ComponentPreview>
          <ComponentPreview
            fullWidth
            name="FeedbackProvider / Toast"
            description={t('showcase.catalog.toastDescription')}
            states={['Info', 'Success', 'Warning', 'Danger', 'Queue', 'Action', 'Dismiss']}
          >
            <div className="flex flex-wrap gap-2">
              {(['info', 'success', 'warning', 'danger'] as const).map((tone) => (
                <Action
                  key={tone}
                  size="sm"
                  variant={tone === 'danger' ? 'danger' : 'secondary'}
                  onPress={() =>
                    notify({
                      title: `${t('showcase.toastTitle')} · ${tone}`,
                      description: t('showcase.toastDescription'),
                      tone,
                    })
                  }
                >
                  {tone}
                </Action>
              ))}
            </div>
          </ComponentPreview>
        </div>
      </PageSection>

      <PageSection
        id="status-async"
        title={t('showcase.statusTitle')}
        description={t('showcase.statusDescription')}
      >
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <ComponentPreview
            name="StatusPill"
            description={t('showcase.catalog.statusDescription')}
            states={['Neutral', 'Success', 'Warning', 'Danger', 'Info']}
          >
            <div aria-label={t('showcase.statusTonesLabel')} className="mt-4 flex flex-wrap gap-2">
              <StatusPill>{t('showcase.defaultStatus')}</StatusPill>
              <StatusPill tone="success">{t('showcase.successStatus')}</StatusPill>
              <StatusPill tone="warning">{t('showcase.warningStatus')}</StatusPill>
              <StatusPill tone="danger">{t('showcase.dangerStatus')}</StatusPill>
              <StatusPill tone="info">{t('showcase.infoStatus')}</StatusPill>
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="ProgressMeter"
            description={t('showcase.progressDescription')}
            states={['0%', '64%', '100%', 'Clamped', 'Accessible output']}
          >
            <div className="grid gap-4">
              <ProgressMeter value={0} label={t('showcase.catalog.progressQueued')} />
              <ProgressMeter value={showcaseProgressValue} label={t('showcase.progressLabel')} />
              <ProgressMeter value={100} label={t('showcase.catalog.progressComplete')} />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="BusyIndicator"
            description={t('showcase.catalog.busyDescription')}
            states={['sm / md / lg', 'Icon only', 'Visible label', 'Reduced motion']}
          >
            <div className="flex flex-wrap items-center gap-6">
              <BusyIndicator label={t('showcase.busyLabel')} size="sm" />
              <BusyIndicator label={t('showcase.busyLabel')} showLabel />
              <BusyIndicator label={t('showcase.busyLabel')} showLabel size="lg" />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="Skeleton"
            description={t('showcase.catalog.skeletonDescription')}
            states={['Text', 'Avatar', 'Card', 'aria-hidden', 'Busy composition']}
          >
            <div
              aria-busy="true"
              aria-label={t('showcase.catalog.loadingPreview')}
              className="flex items-center gap-3"
              role="status"
            >
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="grid min-w-0 flex-1 gap-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          </ComponentPreview>
          <ComponentPreview
            fullWidth
            name="StateSurface"
            description={t('showcase.catalog.stateSurfaceDescription')}
            states={[
              'Loading',
              'Empty',
              'Error',
              'Success',
              'Warning',
              'Disabled',
              'Pending',
              'Offline',
              'Permission',
            ]}
          >
            <TabsView
              label={t('showcase.catalog.stateTabs')}
              items={(
                [
                  ['loading', <RefreshCw className="size-5" />],
                  ['empty', <Inbox className="size-5" />],
                  ['error', <XCircle className="size-5" />],
                  ['success', <CheckCircle2 className="size-5" />],
                  ['warning', <AlertTriangle className="size-5" />],
                  ['disabled', <ShieldAlert className="size-5" />],
                  ['pending', <RefreshCw className="size-5" />],
                  ['offline', <WifiOff className="size-5" />],
                  ['permission-denied', <ShieldAlert className="size-5" />],
                ] as const
              ).map(([state, icon]) => ({
                id: state,
                label: t(`states.${state}.title`),
                content: (
                  <StateSurface
                    compact
                    state={state}
                    icon={icon}
                    title={t(`states.${state}.title`)}
                    description={t(`states.${state}.description`)}
                    {...(state === 'error'
                      ? { actionLabel: t('states.retry'), onAction: () => setLastAction('Retry') }
                      : {})}
                  />
                ),
              }))}
            />
          </ComponentPreview>
        </div>
      </PageSection>

      <PageSection
        id="identity-display"
        title={t('showcase.catalog.identityDisplay')}
        description={t('showcase.catalog.identityDisplayDescription')}
      >
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <ComponentPreview
            name="Avatar"
            description={t('showcase.catalog.avatarDescription')}
            states={['Image', 'Fallback', 'sm / md / lg', '3 presence tones']}
          >
            <div className="flex flex-wrap items-end gap-5">
              <Avatar name="Avery Morgan" size="sm" src={avatarDemoUrl} />
              <Avatar
                name="Rin"
                presence={{ label: t('showcase.presenceOnline'), tone: 'success' }}
              />
              <Avatar
                name="Lin Chen"
                size="lg"
                presence={{ label: t('showcase.catalog.presenceAway'), tone: 'warning' }}
              />
              <Avatar
                name="Noah Williams"
                size="lg"
                presence={{ label: t('showcase.catalog.presenceOffline'), tone: 'neutral' }}
              />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="UserIdentity"
            description={t('showcase.catalog.userIdentityDescription')}
            states={['Image', 'Fallback', 'Presence', 'Optional description', 'Long content']}
          >
            <div className="grid gap-4">
              <UserIdentity
                avatarSrc={avatarDemoUrl}
                description={t('showcase.identityDescription')}
                name="Avery Morgan"
                presence={{ label: t('showcase.presenceOnline'), tone: 'success' }}
              />
              <UserIdentity
                description={longText ? t('showcase.longDescription') : undefined}
                name="Lin Chen with an intentionally long display name"
              />
            </div>
          </ComponentPreview>
          <ComponentPreview
            fullWidth
            name="DescriptionList"
            description={t('showcase.catalog.descriptionListDescription')}
            states={['1 / 2 columns', 'Missing value', 'Long content', 'Narrow reflow']}
          >
            <DescriptionList
              columns={2}
              label={t('showcase.descriptionListLabel')}
              items={[
                {
                  id: 'role',
                  term: t('showcase.roleTerm'),
                  description: t('showcase.identityDescription'),
                },
                {
                  id: 'region',
                  term: t('showcase.regionTerm'),
                  description: t('reference.region.apac'),
                },
                {
                  id: 'owner',
                  term: t('showcase.dataTableColumns.owner'),
                  description: longText ? t('showcase.longDescription') : 'Avery Morgan',
                },
                {
                  id: 'optional',
                  term: t('showcase.catalog.optionalValue'),
                  description: undefined,
                },
              ]}
            />
          </ComponentPreview>
        </div>
      </PageSection>

      <PageSection
        id="navigation"
        title={t('showcase.navigationTitle')}
        description={t('showcase.catalog.navigationDescription')}
      >
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <ComponentPreview
            name="TextLink"
            description={t('showcase.catalog.textLinkDescription')}
            states={['Brand', 'Neutral', 'Leading / trailing icon', 'External', 'Host adapter']}
          >
            <div className="flex flex-wrap gap-5">
              <TextLink href="#actions" leadingIcon={<ChevronRight />}>
                {t('showcase.catalog.backToActions')}
              </TextLink>
              <TextLink
                href="#navigation"
                tone="neutral"
                trailingIcon={<ChevronRight />}
                onNavigate={() => setLastAction('TextLink')}
              >
                {t('showcase.catalog.interceptedLink')}
              </TextLink>
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="BreadcrumbTrail"
            description={t('showcase.catalog.breadcrumbDescription')}
            states={['Linked', 'Disabled', 'Current', 'aria-current']}
          >
            <BreadcrumbTrail
              label={t('layout.breadcrumb')}
              items={[
                { id: 'root', label: t('showcase.breadcrumbRoot'), href: '/' },
                { id: 'disabled', label: t('showcase.catalog.disabledLevel'), disabled: true },
                { id: 'current', label: t('showcase.breadcrumbCurrent') },
              ]}
            />
          </ComponentPreview>
          <ComponentPreview
            name="PaginationControl"
            description={t('showcase.catalog.paginationDescription')}
            states={['Current', 'Previous / next', 'Ellipsis', 'Boundary', 'Disabled']}
          >
            <div className="grid gap-4">
              <PaginationControl
                getPageLabel={(pageNumber) => t('showcase.pageLabel', { page: pageNumber })}
                label={t('showcase.paginationLabel')}
                nextLabel={t('showcase.nextPage')}
                onPageChange={setPage}
                page={page}
                previousLabel={t('showcase.previousPage')}
                totalPages={12}
              />
              <PaginationControl
                disabled
                getPageLabel={(pageNumber) => t('showcase.pageLabel', { page: pageNumber })}
                label={t('showcase.catalog.disabledPagination')}
                nextLabel={t('showcase.nextPage')}
                onPageChange={() => undefined}
                page={1}
                previousLabel={t('showcase.previousPage')}
                totalPages={1}
              />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="TabsView"
            description={t('showcase.catalog.tabsDescription')}
            states={['Selected', 'Disabled', 'Controlled', 'Keyboard', 'Content tabs only']}
          >
            <TabsView
              label={t('showcase.catalog.contentTabsLabel')}
              selectedId={contentTab}
              onSelectionChange={setContentTab}
              items={[
                {
                  id: 'overview',
                  label: t('showcase.normalTab'),
                  content: <p className="p-4 text-sm text-ink-muted">{description}</p>,
                },
                {
                  id: 'activity',
                  label: t('showcase.emptyTab'),
                  content: (
                    <p className="p-4 text-sm text-ink-muted">{t('showcase.dataTableEmpty')}</p>
                  ),
                },
                {
                  id: 'locked',
                  label: t('showcase.catalog.locked'),
                  content: null,
                  disabled: true,
                },
              ]}
            />
          </ComponentPreview>
        </div>
      </PageSection>

      <PageSection
        id="data"
        title={t('showcase.dataDisplayTitle')}
        description={t('showcase.dataDisplayDescription')}
      >
        <div className="p-5">
          <ComponentPreview
            fullWidth
            name="DataTable"
            description={t('showcase.catalog.dataTableDescription')}
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
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <ToggleGroup
                label={t('showcase.catalog.tableMode')}
                options={[
                  { id: 'single', label: t('showcase.catalog.singleSelection') },
                  { id: 'multiple', label: t('showcase.catalog.multipleSelection') },
                  { id: 'empty', label: t('showcase.dataTableShowEmpty') },
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
                    ? t('showcase.dataTableRestoreRows')
                    : t('showcase.dataTableShowEmpty')}
                </Action>
              </div>
            </div>
            <DataTable
              label={t('showcase.dataTableLabel')}
              columns={visibleTableColumns}
              density={density}
              emptyContent={t('showcase.dataTableEmpty')}
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
                onSortChange: (columnId, direction) => setTableSort({ columnId, direction }),
              }}
            />
          </ComponentPreview>
        </div>
      </PageSection>

      <PageSection
        id="surfaces"
        title={t('showcase.cardsTitle')}
        description={t('showcase.cardsDescription')}
      >
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <ComponentPreview
            embedded
            fullWidth
            name="Card / CardHeader / CardContent / CardFooter"
            description={t('showcase.catalog.cardDescription')}
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
                  action={<Badge tone="info">{t('showcase.elevatedCardBadge')}</Badge>}
                  title={t('showcase.elevatedCardTitle')}
                />
                <CardContent>
                  <p className="text-sm leading-6 text-ink-muted">{description}</p>
                </CardContent>
                <CardFooter>
                  <Action size="sm" onPress={() => setLastAction(t('showcase.elevatedCardTitle'))}>
                    {t('showcase.cardAction')}
                  </Action>
                </CardFooter>
              </Card>
              <Card appearance="outlined">
                <CardHeader
                  action={<Badge>{t('showcase.outlinedCardBadge')}</Badge>}
                  title={t('showcase.outlinedCardTitle')}
                />
                <CardContent>
                  <p className="text-sm leading-6 text-ink-muted">{description}</p>
                </CardContent>
                <CardFooter>
                  <Action
                    variant="secondary"
                    size="sm"
                    onPress={() => setLastAction(t('showcase.outlinedCardTitle'))}
                  >
                    {t('showcase.cardAction')}
                  </Action>
                </CardFooter>
              </Card>
              <Card appearance="flat">
                <CardHeader
                  action={<Badge tone="neutral">{t('showcase.embeddedCardBadge')}</Badge>}
                  title={t('showcase.embeddedCardTitle')}
                />
                <CardContent>
                  <p className="text-sm leading-6 text-ink-muted">{description}</p>
                </CardContent>
                <CardFooter>
                  <Action
                    variant="quiet"
                    size="sm"
                    onPress={() => setLastAction(t('showcase.embeddedCardTitle'))}
                  >
                    {t('showcase.cardAction')}
                  </Action>
                </CardFooter>
              </Card>
            </div>
          </ComponentPreview>
          <ComponentPreview
            embedded
            fullWidth
            name="Panel"
            description={t('showcase.catalog.panelDescription')}
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
      </PageSection>

      <PageSection
        id="forms"
        title={t('showcase.fieldsTitle')}
        description={t('showcase.fieldsDescription')}
      >
        <div className={`grid p-5 lg:grid-cols-2 ${spacing}`}>
          <ComponentPreview
            fullWidth
            name="TextField"
            description={t('showcase.catalog.textFieldDescription')}
            states={['Default', 'Hint', 'Invalid', 'Disabled', 'Placeholder', 'Long content']}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label={t('showcase.textField')}
                hint={t('showcase.fieldHint')}
                placeholder={t('showcase.placeholder')}
              />
              <TextField
                label={t('showcase.errorField')}
                error={t('showcase.errorMessage')}
                defaultValue="x"
              />
              <TextField label={t('showcase.disabledField')} disabled defaultValue="readonly" />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="TextAreaField"
            description={t('showcase.catalog.textAreaDescription')}
            states={['Default', 'Hint / error', 'Disabled', 'Rows', 'Resize', 'Long content']}
          >
            <TextAreaField
              label={t('showcase.textArea')}
              hint={t('showcase.fieldHint')}
              defaultValue={description}
            />
          </ComponentPreview>
          <ComponentPreview
            name="SearchBox"
            description={t('showcase.catalog.searchBoxDescription')}
            states={['Value', 'Clear', 'Disabled', 'Accessible label']}
          >
            <div className="grid gap-3">
              <SearchBox
                label={t('reference.searchLabel')}
                placeholder={t('reference.searchPlaceholder')}
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <SearchBox
                disabled
                label={t('showcase.catalog.disabledSearch')}
                placeholder={t('reference.searchPlaceholder')}
              />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="SelectField"
            description={t('showcase.catalog.selectDescription')}
            states={['Selected', 'Disabled option', 'Disabled field', 'Popup scroll', 'Keyboard']}
          >
            <div className="grid gap-3">
              <SelectField
                label={t('showcase.select')}
                hint={t('showcase.selectionOverlayHint')}
                defaultOpen={overlay === 'select'}
                options={[
                  { value: 'observe', label: t('formReference.modeOption.observe') },
                  { value: 'guided', label: t('formReference.modeOption.guided') },
                  {
                    value: 'automatic',
                    label: t('formReference.modeOption.automatic'),
                    disabled: true,
                  },
                  ...Array.from({ length: 12 }, (_, index) => ({
                    value: `queue-${index + 1}`,
                    label: t('showcase.queueOption', { number: index + 1 }),
                  })),
                ]}
                value={selected}
                onValueChange={setSelected}
              />
              <SelectField
                disabled
                label={t('showcase.disabledField')}
                options={[{ value: 'guided', label: t('formReference.modeOption.guided') }]}
                value="guided"
              />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="ComboField"
            description={t('showcase.catalog.comboDescription')}
            states={['Filter', 'Selected', 'Disabled option', 'Disabled field', 'Popup scroll']}
          >
            <div className="grid gap-3">
              <ComboField
                label={t('showcase.combobox')}
                hint={t('showcase.selectionOverlayHint')}
                placeholder={t('showcase.comboboxPlaceholder')}
                options={ownerOptions.map((owner) => ({
                  value: owner,
                  label: owner,
                  disabled: owner === 'Omar Haddad',
                }))}
              />
              <ComboField
                disabled
                label={t('showcase.disabledField')}
                placeholder={t('showcase.comboboxPlaceholder')}
                options={[]}
              />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="DatePickerField"
            description={t('showcase.catalog.dateDescription')}
            states={['Segments', 'Popup', 'Selected date', 'Disabled', 'Keyboard']}
          >
            <div className="grid gap-3">
              <DatePickerField
                label={t('showcase.datePicker')}
                hint={t('showcase.overlayHint')}
                calendarLabel={t('formReference.calendarLabel')}
                defaultOpen={overlay === 'date'}
              />
              <DatePickerField
                disabled
                label={t('showcase.disabledField')}
                calendarLabel={t('formReference.calendarLabel')}
              />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="CheckboxField"
            description={t('showcase.catalog.checkboxDescription')}
            states={['Selected', 'Unselected', 'Description', 'Disabled']}
          >
            <div className="grid gap-3">
              <CheckboxField
                label={t('showcase.checkbox')}
                description={t('showcase.checkboxDescription')}
                checked={checked}
                onCheckedChange={setChecked}
              />
              <CheckboxField label={t('showcase.disabledCheckbox')} checked={false} disabled />
            </div>
          </ComponentPreview>
          <ComponentPreview
            name="RadioGroupField"
            description={t('showcase.catalog.radioDescription')}
            states={['Selected', 'Disabled option', 'Hint / error', 'Keyboard']}
          >
            <RadioGroupField
              label={t('showcase.radioGroup')}
              options={[
                { value: 'observe', label: t('formReference.modeOption.observe') },
                { value: 'guided', label: t('formReference.modeOption.guided') },
                {
                  value: 'automatic',
                  label: t('formReference.modeOption.automatic'),
                  disabled: true,
                },
              ]}
              value={selected}
              onValueChange={setSelected}
            />
          </ComponentPreview>
          <ComponentPreview
            name="SwitchField"
            description={t('showcase.catalog.switchDescription')}
            states={['On', 'Off', 'Disabled', 'Description']}
          >
            <div className="grid gap-3">
              <SwitchField
                label={t('showcase.longText')}
                description={t('showcase.longTextDescription')}
                checked={longText}
                onCheckedChange={setLongText}
              />
              <SwitchField
                disabled
                label={t('showcase.disabled')}
                description={t('showcase.catalog.disabledControlDescription')}
                checked={false}
                onCheckedChange={() => undefined}
              />
            </div>
          </ComponentPreview>
        </div>
      </PageSection>

      <PageSection
        id="overlays"
        title={t('showcase.overlaysTitle')}
        description={t('showcase.overlaysDescription')}
      >
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <ComponentPreview
            name="MenuButton"
            description={t('showcase.catalog.menuDescription')}
            states={['Default', 'Icon', 'Description', 'Disabled', 'Danger', 'Keyboard']}
          >
            <MenuButton
              ariaLabel={t('showcase.menuLabel')}
              label={t('showcase.menu')}
              defaultOpen={overlay === 'menu'}
              onAction={(id) => setLastAction(id)}
              items={[
                { id: 'edit', label: t('showcase.menuEdit'), icon: <Pencil className="size-4" /> },
                { id: 'copy', label: t('showcase.menuCopy'), icon: <Copy className="size-4" /> },
                {
                  id: 'archive',
                  label: t('showcase.menuArchive'),
                  icon: <Archive className="size-4" />,
                  disabled: true,
                },
                {
                  id: 'delete',
                  label: t('showcase.menuDelete'),
                  icon: <Trash2 className="size-4" />,
                  tone: 'danger',
                },
              ]}
            />
          </ComponentPreview>
          <ComponentPreview
            name="PopoverCard"
            description={t('showcase.catalog.popoverDescription')}
            states={['Trigger', 'Heading', 'Long content', 'Focus return', 'Collision']}
          >
            <PopoverCard
              triggerLabel={t('showcase.popover')}
              title={t('showcase.popoverTitle')}
              defaultOpen={overlay === 'popover'}
            >
              {description}
            </PopoverCard>
          </ComponentPreview>
          <ComponentPreview
            name="TooltipAction"
            description={t('showcase.catalog.tooltipDescription')}
            states={['Hover', 'Focus', 'Delay', 'Escape', 'Non-interactive content']}
          >
            <TooltipAction
              label={t('showcase.tooltip')}
              tooltip={t('showcase.tooltipContent')}
              defaultOpen={overlay === 'tooltip'}
            />
          </ComponentPreview>
          <ComponentPreview
            name="DialogSurface"
            description={t('showcase.catalog.dialogDescription')}
            states={['Form content', 'Cancel', 'Confirm', 'Pending', 'Failure', 'Focus trap']}
          >
            <DialogSurface
              triggerLabel={t('showcase.dialog')}
              title={t('showcase.dialogTitle')}
              description={t('showcase.dialogDescription')}
              cancelLabel={t('reference.cancel')}
              confirmLabel={t('reference.confirm')}
              defaultOpen={overlay === 'dialog'}
              onConfirm={() => setLastAction(t('reference.confirm'))}
            >
              <TextField label={t('showcase.dialogField')} defaultValue="Community" />
            </DialogSurface>
          </ComponentPreview>
          <ComponentPreview
            name="ConfirmDialog"
            description={t('showcase.catalog.confirmDescription')}
            states={['Impact', 'Cancel', 'Confirm', 'Disabled', 'Pending', 'Failure']}
          >
            <ConfirmDialog
              cancelLabel={t('reference.cancel')}
              confirmLabel={t('reference.confirm')}
              description={t('showcase.catalog.confirmPrompt')}
              failureMessage={t('showcase.confirmFailure')}
              impact={t('showcase.catalog.confirmImpact')}
              title={t('showcase.catalog.confirmTitle')}
              triggerLabel={t('showcase.catalog.confirmTrigger')}
              defaultOpen={overlay === 'confirm-primary'}
              onConfirm={() => setLastAction(t('reference.confirm'))}
            />
          </ComponentPreview>
          <ComponentPreview
            name="DestructiveConfirmDialog"
            description={t('showcase.catalog.destructiveConfirmDescription')}
            states={['Danger tone', 'Impact', 'Pending', 'Failure', 'Focus restore']}
          >
            <DestructiveConfirmDialog
              cancelLabel={t('reference.cancel')}
              confirmLabel={t('showcase.destructiveAction')}
              description={t('showcase.destructiveDescription')}
              failureMessage={t('showcase.confirmFailure')}
              impact={t('showcase.destructiveImpact')}
              title={t('showcase.destructiveTitle')}
              triggerLabel={t('showcase.destructiveConfirm')}
              defaultOpen={overlay === 'confirm'}
              onConfirm={() => setLastAction(t('showcase.destructiveAction'))}
            />
          </ComponentPreview>
          <ComponentPreview
            name="DrawerSurface"
            description={t('showcase.catalog.drawerDescription')}
            states={['Right sheet', 'Header / body', 'Close', 'Scroll', 'Narrow viewport']}
          >
            <DrawerSurface
              triggerLabel={t('showcase.drawer')}
              title={t('showcase.drawerTitle')}
              description={t('showcase.drawerDescription')}
              closeLabel={t('reference.close')}
              defaultOpen={overlay === 'drawer'}
            >
              <div className="space-y-4">
                <TextField label={t('showcase.drawerField')} defaultValue="Reference surface" />
                <SwitchField
                  label={t('showcase.drawerSwitch')}
                  description={t('showcase.drawerSwitchDescription')}
                  checked={checked}
                  onCheckedChange={setChecked}
                />
              </div>
            </DrawerSurface>
          </ComponentPreview>
          <ComponentPreview
            name="CommandMenu"
            description={t('showcase.catalog.commandDescription')}
            states={['Search', 'Filtered', 'Empty', 'Keyboard action', 'Modal focus']}
          >
            <CommandMenu
              triggerLabel={t('showcase.command')}
              title={t('showcase.commandTitle')}
              searchLabel={t('showcase.commandSearchLabel')}
              searchPlaceholder={t('showcase.commandSearchPlaceholder')}
              emptyLabel={t('showcase.commandEmpty')}
              defaultOpen={overlay === 'command'}
              onAction={(id) => setLastAction(id)}
              items={[
                {
                  id: 'workspace',
                  label: t('nav.reference'),
                  description: t('reference.description'),
                },
                {
                  id: 'form',
                  label: t('nav.formReference'),
                  description: t('formReference.description'),
                },
                {
                  id: 'states',
                  label: t('nav.states'),
                  description: t('states.description'),
                },
              ]}
            />
          </ComponentPreview>
        </div>
      </PageSection>

      <PageSection
        title={t('showcase.compositionTitle')}
        description={t('showcase.compositionDescription')}
      >
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <Panel appearance="outlined" className="overflow-hidden">
            <div className="border-b border-border p-4">
              <h3 className="font-bold text-ink">{t('showcase.embeddedTitle')}</h3>
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
              label={t('showcase.tabsLabel')}
              items={[
                {
                  id: 'normal',
                  label: t('showcase.normalTab'),
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
                  label: t('showcase.emptyTab'),
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
                  label: t('showcase.warningTab'),
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
      </PageSection>
    </PageLayout>
  );
}
