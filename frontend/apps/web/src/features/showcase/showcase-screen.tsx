import {
  Action,
  AlertBanner,
  Badge,
  CheckboxField,
  ComboField,
  CommandMenu,
  DatePickerField,
  DialogSurface,
  DrawerSurface,
  MenuButton,
  NotificationCard,
  Panel,
  PopoverCard,
  SearchBox,
  SelectField,
  StateSurface,
  StatusPill,
  SwitchField,
  TabsView,
  TextAreaField,
  TextField,
  TooltipAction,
} from '@community-go/ui-adapter';
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckCircle2,
  Copy,
  Inbox,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { PageHeader, PageLayout, PageSection } from '../../layouts/page-layout';
import { useShellStore } from '../../state/use-shell-store';

export function ShowcaseScreen() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const overlay = searchParams.get('overlay');
  const locale = useShellStore((state) => state.locale);
  const setLocale = useShellStore((state) => state.setLocale);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [longText, setLongText] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(true);
  const [checked, setChecked] = useState(true);
  const [selected, setSelected] = useState('guided');
  const description = longText ? t('showcase.longDescription') : t('showcase.shortDescription');
  const spacing = density === 'compact' ? 'gap-2' : 'gap-4';

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
          <Action>{t('showcase.primary')}</Action>
          <Action variant="secondary">{t('showcase.secondary')}</Action>
          <Action variant="quiet">{t('showcase.quiet')}</Action>
          <Action variant="danger">{t('showcase.danger')}</Action>
          <Action size="sm">{t('showcase.small')}</Action>
          <Action loading>{t('showcase.loading')}</Action>
          <Action disabled>{t('showcase.disabled')}</Action>
        </div>
      </PageSection>

      <PageSection
        title={t('showcase.feedbackTitle')}
        description={t('showcase.feedbackDescription')}
      >
        <div className="grid gap-5 p-5 xl:grid-cols-2">
          <div className="grid content-start gap-3">
            <AlertBanner
              tone="success"
              icon={<CheckCircle2 className="size-5" />}
              title={t('showcase.successAlertTitle')}
              description={description}
            />
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

      <PageSection title={t('showcase.cardsTitle')} description={t('showcase.cardsDescription')}>
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          <Panel appearance="elevated" className="p-5">
            <Badge tone="info">{t('showcase.elevatedCardBadge')}</Badge>
            <h3 className="mt-4 text-base font-bold text-ink">{t('showcase.elevatedCardTitle')}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
            <div className="mt-5">
              <Action size="sm">{t('showcase.cardAction')}</Action>
            </div>
          </Panel>
          <Panel appearance="outlined" className="p-5">
            <Badge>{t('showcase.outlinedCardBadge')}</Badge>
            <h3 className="mt-4 text-base font-bold text-ink">{t('showcase.outlinedCardTitle')}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
            <div className="mt-5">
              <Action variant="secondary" size="sm">
                {t('showcase.cardAction')}
              </Action>
            </div>
          </Panel>
          <Panel appearance="embedded" tone="muted" className="rounded-panel p-5">
            <Badge tone="neutral">{t('showcase.embeddedCardBadge')}</Badge>
            <h3 className="mt-4 text-base font-bold text-ink">{t('showcase.embeddedCardTitle')}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
            <div className="mt-5">
              <Action variant="quiet" size="sm">
                {t('showcase.cardAction')}
              </Action>
            </div>
          </Panel>
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
            hint={t('showcase.overlayHint')}
            defaultOpen={overlay === 'select'}
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
          <ComboField
            label={t('showcase.combobox')}
            hint={t('showcase.overlayHint')}
            placeholder={t('showcase.comboboxPlaceholder')}
            options={[
              { value: 'Lin Chen', label: 'Lin Chen' },
              { value: 'Avery Morgan', label: 'Avery Morgan' },
              { value: 'Mika Sato', label: 'Mika Sato' },
            ]}
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
          <CheckboxField
            label={t('showcase.disabledCheckbox')}
            checked={false}
            disabled
            onCheckedChange={() => undefined}
          />
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
          >
            <TextField label={t('showcase.dialogField')} defaultValue="Community" />
          </DialogSurface>
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
          <Panel appearance="outlined" className="overflow-hidden">
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

      <div className="flex flex-wrap gap-2">
        <StatusPill>{t('showcase.defaultStatus')}</StatusPill>
        <StatusPill tone="success">{t('showcase.successStatus')}</StatusPill>
        <StatusPill tone="warning">{t('showcase.warningStatus')}</StatusPill>
        <StatusPill tone="danger">{t('showcase.dangerStatus')}</StatusPill>
        <StatusPill tone="info">{t('showcase.infoStatus')}</StatusPill>
        <MoreHorizontal className="size-5 text-ink-muted" />
      </div>
    </PageLayout>
  );
}
