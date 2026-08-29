import { referenceFormSchema, type ReferenceFormInput } from '@community-go/schemas';
import {
  Action,
  CheckboxField,
  ComboField,
  DatePickerField,
  Panel,
  SelectField,
  StatusPill,
  SwitchField,
  TabsView,
  TextAreaField,
  TextField,
} from '@community-go/ui-adapter';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Save, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  FooterActions,
  PageHeader,
  PageLayout,
  PageSection,
  SplitView,
} from '../../layouts/page-layout';

const simulatedSaveDelayMs = 450;

export function ReferenceFormScreen() {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ReferenceFormInput>({
    resolver: zodResolver(referenceFormSchema),
    defaultValues: {
      name: 'Regional release readiness',
      owner: 'Lin Chen',
      region: 'apac',
      mode: 'guided',
      description:
        'This reference draft deliberately combines validation, overlays, long content, nested sections, and sticky footer actions.',
      reviewDate: '2026-09-15',
      notifyReviewers: true,
      allowOfflineDraft: false,
    },
  });

  const submit = async () => {
    setPending(true);
    setSaved(false);
    await new Promise((resolve) => window.setTimeout(resolve, simulatedSaveDelayMs));
    setPending(false);
    setSaved(true);
  };

  const errorProps = (field: keyof typeof errors): Readonly<{ error?: string }> =>
    errors[field] ? { error: t(`formReference.errors.${field}`) } : {};

  return (
    <form onSubmit={(event) => void handleSubmit(submit)(event)}>
      <PageLayout>
        <PageHeader
          breadcrumbLabel={t('layout.breadcrumb')}
          breadcrumbs={[
            { label: t('reference.breadcrumbRoot') },
            { label: t('formReference.breadcrumbCurrent'), current: true },
          ]}
          eyebrow={t('formReference.eyebrow')}
          title={t('formReference.title')}
          description={t('formReference.description')}
          actions={
            saved ? (
              <StatusPill tone="success">{t('formReference.saved')}</StatusPill>
            ) : isDirty ? (
              <StatusPill tone="warning">{t('formReference.unsaved')}</StatusPill>
            ) : (
              <StatusPill>{t('formReference.pristine')}</StatusPill>
            )
          }
        />

        <SplitView
          master={
            <PageSection
              title={t('formReference.sectionTitle')}
              description={t('formReference.sectionDescription')}
            >
              <TabsView
                label={t('formReference.tabsLabel')}
                items={[
                  {
                    id: 'identity',
                    label: t('formReference.tabs.identity'),
                    content: (
                      <div className="grid gap-5 p-5 sm:p-6">
                        <TextField
                          label={t('formReference.name')}
                          hint={t('formReference.nameHint')}
                          disabled={pending}
                          {...errorProps('name')}
                          {...register('name')}
                        />
                        <div className="grid gap-5 md:grid-cols-2">
                          <Controller
                            control={control}
                            name="owner"
                            render={({ field }) => (
                              <ComboField
                                label={t('formReference.owner')}
                                hint={t('formReference.ownerHint')}
                                placeholder={t('formReference.ownerPlaceholder')}
                                disabled={pending}
                                options={[
                                  { value: 'Lin Chen', label: 'Lin Chen' },
                                  { value: 'Avery Morgan', label: 'Avery Morgan' },
                                  { value: 'Mika Sato', label: 'Mika Sato' },
                                  { value: 'Sam Rivera', label: 'Sam Rivera' },
                                ]}
                                value={field.value}
                                onValueChange={field.onChange}
                                {...errorProps('owner')}
                              />
                            )}
                          />
                          <Controller
                            control={control}
                            name="region"
                            render={({ field }) => (
                              <SelectField
                                label={t('formReference.region')}
                                hint={t('formReference.regionHint')}
                                disabled={pending}
                                options={[
                                  { value: 'apac', label: t('reference.region.apac') },
                                  { value: 'emea', label: t('reference.region.emea') },
                                  { value: 'americas', label: t('reference.region.americas') },
                                ]}
                                value={field.value}
                                onValueChange={field.onChange}
                              />
                            )}
                          />
                        </div>
                        <TextAreaField
                          label={t('formReference.descriptionLabel')}
                          hint={t('formReference.descriptionHint')}
                          disabled={pending}
                          rows={7}
                          {...errorProps('description')}
                          {...register('description')}
                        />
                      </div>
                    ),
                  },
                  {
                    id: 'behavior',
                    label: t('formReference.tabs.behavior'),
                    content: (
                      <div className="grid gap-5 p-5 sm:p-6">
                        <Controller
                          control={control}
                          name="mode"
                          render={({ field }) => (
                            <SelectField
                              label={t('formReference.mode')}
                              hint={t('formReference.modeHint')}
                              disabled={pending}
                              options={[
                                {
                                  value: 'observe',
                                  label: t('formReference.modeOption.observe'),
                                  description: t('formReference.modeOption.observeDescription'),
                                },
                                {
                                  value: 'guided',
                                  label: t('formReference.modeOption.guided'),
                                  description: t('formReference.modeOption.guidedDescription'),
                                },
                                {
                                  value: 'automatic',
                                  label: t('formReference.modeOption.automatic'),
                                  description: t('formReference.modeOption.automaticDescription'),
                                  disabled: true,
                                },
                              ]}
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          )}
                        />
                        <DatePickerField
                          label={t('formReference.reviewDate')}
                          hint={t('formReference.reviewDateHint')}
                          calendarLabel={t('formReference.calendarLabel')}
                          disabled={pending}
                          onValueChange={(value) =>
                            setValue('reviewDate', value ?? '', { shouldDirty: true })
                          }
                        />
                        <Controller
                          control={control}
                          name="notifyReviewers"
                          render={({ field }) => (
                            <SwitchField
                              label={t('formReference.notify')}
                              description={t('formReference.notifyDescription')}
                              checked={field.value}
                              disabled={pending}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          name="allowOfflineDraft"
                          render={({ field }) => (
                            <CheckboxField
                              label={t('formReference.offlineDraft')}
                              description={t('formReference.offlineDraftDescription')}
                              checked={field.value}
                              disabled={pending}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>
                    ),
                  },
                  {
                    id: 'review',
                    label: t('formReference.tabs.review'),
                    content: (
                      <div className="p-5 sm:p-6">
                        <div className="flex items-start gap-4 rounded-panel bg-success-soft p-5 text-success">
                          <ShieldCheck className="size-6 shrink-0" />
                          <div>
                            <h3 className="font-bold">{t('formReference.reviewTitle')}</h3>
                            <p className="mt-2 text-sm leading-6 text-ink-muted">
                              {t('formReference.reviewDescription')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </PageSection>
          }
          detail={
            <Panel className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-control bg-brand-soft text-brand">
                  <CheckCircle2 className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink">{t('formReference.asideTitle')}</h2>
                  <p className="text-xs text-ink-muted">{t('formReference.asideDescription')}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {(['schema', 'keyboard', 'states', 'host'] as const).map((item) => (
                  <li className="flex gap-2 text-sm leading-6 text-ink-muted" key={item}>
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" />
                    {t(`formReference.checks.${item}`)}
                  </li>
                ))}
              </ul>
            </Panel>
          }
        />

        <FooterActions>
          <Action
            disabled={pending}
            variant="quiet"
            onPress={() => {
              reset();
              setSaved(false);
            }}
          >
            {t('formReference.reset')}
          </Action>
          <Action type="submit" loading={pending} leadingIcon={<Save className="size-4" />}>
            {pending ? t('formReference.saving') : t('formReference.save')}
          </Action>
        </FooterActions>
      </PageLayout>
    </form>
  );
}
