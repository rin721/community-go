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
  DatePickerField,
  DataTable,
  DestructiveConfirmDialog,
  DescriptionList,
  DialogSurface,
  DrawerSurface,
  MenuButton,
  NotificationCard,
  Panel,
  PaginationControl,
  PopoverCard,
  ProgressMeter,
  RadioGroupField,
  SearchBox,
  SelectField,
  StateSurface,
  StatusPill,
  SwitchField,
  TabsView,
  TextAreaField,
  TextField,
  TooltipAction,
  UserIdentity,
  useFeedback,
  type DataColumn,
} from '@community-go/ui-adapter';
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckCircle2,
  Copy,
  Inbox,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { PageHeader, PageLayout, PageSection } from '../../layouts/page-layout';
import { useShellStore } from '../../state/use-shell-store';

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
  const [showEmptyTable, setShowEmptyTable] = useState(searchParams.get('data') === 'empty');
  const [selectedTableId, setSelectedTableId] = useState('UI-001');
  const [checked, setChecked] = useState(true);
  const [selected, setSelected] = useState('guided');
  const [page, setPage] = useState(2);
  const [lastAction, setLastAction] = useState<string>();
  const directToastSent = useRef(false);
  const description = longText ? t('showcase.longDescription') : t('showcase.shortDescription');
  const spacing = density === 'compact' ? 'gap-2' : 'gap-4';

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
      render: (row) => row.owner,
    },
    {
      id: 'status',
      label: t('showcase.dataTableColumns.status'),
      render: (row) => <StatusPill tone={row.tone}>{row.status}</StatusPill>,
    },
  ];

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

      <PageSection title={t('showcase.actionsTitle')} description={description}>
        <div className={`flex flex-wrap items-center p-5 ${spacing}`}>
          <Action onPress={() => setLastAction(t('showcase.primary'))}>
            {t('showcase.primary')}
          </Action>
          <Action variant="secondary" onPress={() => setLastAction(t('showcase.secondary'))}>
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
          <Action loading disabled>
            {t('showcase.loading')}
          </Action>
          <Action disabled>{t('showcase.disabled')}</Action>
          {lastAction ? (
            <span className="text-sm text-ink-muted" role="status">
              {lastAction}
            </span>
          ) : null}
        </div>
      </PageSection>

      <PageSection
        title={t('showcase.feedbackTitle')}
        description={t('showcase.feedbackDescription')}
      >
        <div className="grid gap-5 p-5 xl:grid-cols-2">
          <div className="grid content-start gap-3">
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
          </div>
          <div className="grid content-start gap-4">
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
              <Action
                size="sm"
                variant="secondary"
                onPress={() =>
                  notify({
                    title: t('showcase.toastTitle'),
                    description: t('showcase.toastDescription'),
                    tone: 'info',
                  })
                }
              >
                {t('showcase.toastAction')}
              </Action>
            </div>
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
          </div>
        </div>
      </PageSection>

      <PageSection title={t('showcase.statusTitle')} description={t('showcase.statusDescription')}>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <Panel appearance="embedded" tone="muted" className="rounded-panel p-4">
            <h3 className="text-sm font-bold text-ink">{t('showcase.statusTonesTitle')}</h3>
            <div aria-label={t('showcase.statusTonesLabel')} className="mt-4 flex flex-wrap gap-2">
              <StatusPill>{t('showcase.defaultStatus')}</StatusPill>
              <StatusPill tone="success">{t('showcase.successStatus')}</StatusPill>
              <StatusPill tone="warning">{t('showcase.warningStatus')}</StatusPill>
              <StatusPill tone="danger">{t('showcase.dangerStatus')}</StatusPill>
              <StatusPill tone="info">{t('showcase.infoStatus')}</StatusPill>
            </div>
          </Panel>
          <Panel appearance="embedded" tone="muted" className="rounded-panel p-4">
            <h3 className="text-sm font-bold text-ink">{t('showcase.progressTitle')}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {t('showcase.progressDescription')}
            </p>
            <div className="mt-4">
              <ProgressMeter value={showcaseProgressValue} label={t('showcase.progressLabel')} />
            </div>
          </Panel>
        </div>
      </PageSection>

      <PageSection
        title={t('showcase.identityNavigationTitle')}
        description={t('showcase.identityNavigationDescription')}
      >
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <Card appearance="outlined">
            <CardHeader title={t('showcase.identityTitle')} />
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar
                  name="Rin"
                  size="lg"
                  presence={{ label: t('showcase.presenceOnline'), tone: 'success' }}
                />
                <Avatar name="Lin Chen" />
                <UserIdentity
                  description={t('showcase.identityDescription')}
                  name="Avery Morgan"
                  presence={{ label: t('showcase.presenceOnline'), tone: 'success' }}
                />
              </div>
              <div className="mt-5">
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
                  ]}
                />
              </div>
            </CardContent>
          </Card>
          <Card appearance="outlined">
            <CardHeader title={t('showcase.navigationTitle')} />
            <CardContent>
              <BreadcrumbTrail
                label={t('layout.breadcrumb')}
                items={[
                  { id: 'root', label: t('showcase.breadcrumbRoot'), disabled: true },
                  { id: 'current', label: t('showcase.breadcrumbCurrent') },
                ]}
              />
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <BusyIndicator label={t('showcase.busyLabel')} showLabel />
                <PaginationControl
                  getPageLabel={(pageNumber) => t('showcase.pageLabel', { page: pageNumber })}
                  label={t('showcase.paginationLabel')}
                  nextLabel={t('showcase.nextPage')}
                  onPageChange={setPage}
                  page={page}
                  previousLabel={t('showcase.previousPage')}
                  totalPages={12}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageSection>

      <PageSection
        title={t('showcase.dataDisplayTitle')}
        description={t('showcase.dataDisplayDescription')}
        action={
          <Action size="sm" variant="quiet" onPress={() => setShowEmptyTable((empty) => !empty)}>
            {showEmptyTable ? t('showcase.dataTableRestoreRows') : t('showcase.dataTableShowEmpty')}
          </Action>
        }
      >
        <DataTable
          label={t('showcase.dataTableLabel')}
          columns={tableColumns}
          density={density}
          emptyContent={t('showcase.dataTableEmpty')}
          rows={showEmptyTable ? [] : tableRows}
          selection={{
            onSelectionChange: setSelectedTableId,
            ...(!showEmptyTable ? { selectedId: selectedTableId } : {}),
          }}
        />
      </PageSection>

      <PageSection title={t('showcase.cardsTitle')} description={t('showcase.cardsDescription')}>
        <div className="grid gap-4 p-5 lg:grid-cols-3">
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
      </PageSection>

      <PageSection title={t('showcase.fieldsTitle')} description={t('showcase.fieldsDescription')}>
        <div className={`grid p-5 md:grid-cols-2 xl:grid-cols-3 ${spacing}`}>
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
          <DatePickerField
            label={t('showcase.datePicker')}
            hint={t('showcase.overlayHint')}
            calendarLabel={t('formReference.calendarLabel')}
            defaultOpen={overlay === 'date'}
          />
          <TextAreaField
            label={t('showcase.textArea')}
            hint={t('showcase.fieldHint')}
            defaultValue={description}
          />
          <CheckboxField
            label={t('showcase.checkbox')}
            description={t('showcase.checkboxDescription')}
            checked={checked}
            onCheckedChange={setChecked}
          />
          <RadioGroupField
            label={t('showcase.radioGroup')}
            options={[
              { value: 'observe', label: t('formReference.modeOption.observe') },
              { value: 'guided', label: t('formReference.modeOption.guided') },
            ]}
            value={selected}
            onValueChange={setSelected}
          />
          <CheckboxField label={t('showcase.disabledCheckbox')} checked={false} disabled />
        </div>
      </PageSection>

      <PageSection
        title={t('showcase.overlaysTitle')}
        description={t('showcase.overlaysDescription')}
      >
        <div className={`flex flex-wrap items-center p-5 ${spacing}`}>
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
          <PopoverCard
            triggerLabel={t('showcase.popover')}
            title={t('showcase.popoverTitle')}
            defaultOpen={overlay === 'popover'}
          >
            {description}
          </PopoverCard>
          <TooltipAction
            label={t('showcase.tooltip')}
            tooltip={t('showcase.tooltipContent')}
            defaultOpen={overlay === 'tooltip'}
          />
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
