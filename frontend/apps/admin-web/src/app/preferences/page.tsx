'use client';

import {
  FoundationControlledField,
  FoundationForm,
  useFoundationForm,
} from '@community-go/form-foundation';
import { Action } from '@community-go/ui-adapter/action';
import { useFeedback } from '@community-go/ui-adapter/feedback-context';
import { SelectField, SwitchField, TextField } from '@community-go/ui-adapter/form-field';
import { Panel } from '@community-go/ui-adapter/panel';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { ToggleGroup } from '@community-go/ui-adapter/toggle-group';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';

import { AdminPageHeader } from '@community-go/admin-foundation/layout';
import { PageTransition } from '../../layouts/page-transition';
import type { PreferencesInput } from '../../reference/schemas';
import { useShellStore } from '../../state/use-shell-store';

export default function PreferencesPage() {
  const { t } = useFrontendTranslation();
  const locale = useShellStore((state) => state.locale);
  const setLocale = useShellStore((state) => state.setLocale);
  const { notify } = useFeedback();
  const [saved, setSaved] = useState(false);
  const form = useFoundationForm<PreferencesInput>({
    schema: async () => (await import('../../reference/schemas')).preferencesSchema,
    defaultValues: {
      interfaceName: 'Community Console',
      locale,
      density: 'comfortable',
      reduceMotion: false,
    },
  });

  const onSubmit = (values: PreferencesInput) => {
    setLocale(values.locale);
    setSaved(true);
    notify({
      title: t('preferences.saved'),
      description: t('preferences.description'),
      tone: 'success',
    });
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t('preferences.eyebrow')}
          title={t('preferences.title')}
          description={t('preferences.description')}
          actions={
            saved ? <StatusPill tone="success">{t('preferences.saved')}</StatusPill> : undefined
          }
        />
        <Panel className="max-w-3xl p-5 sm:p-7">
          <FoundationForm className="grid gap-6" form={form} onSubmit={onSubmit}>
            <TextField
              label={t('preferences.name')}
              hint={t('preferences.nameHint')}
              {...(form.hasError('interfaceName') ? { error: t('preferences.nameError') } : {})}
              {...form.registerField('interfaceName')}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FoundationControlledField name="locale" form={form}>
                {(field) => (
                  <SelectField
                    label={t('preferences.locale')}
                    hint={t('preferences.localeHint')}
                    options={[
                      { value: 'zh-CN', label: '简体中文' },
                      { value: 'en', label: 'English' },
                    ]}
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => {
                      if (value === 'zh-CN' || value === 'en') field.onChange(value);
                    }}
                  />
                )}
              </FoundationControlledField>
              <FoundationControlledField name="density" form={form}>
                {(field) => (
                  <ToggleGroup
                    label={t('preferences.density')}
                    description={t('preferences.densityHint')}
                    options={[
                      { id: 'comfortable', label: t('preferences.comfortable') },
                      { id: 'compact', label: t('preferences.compact') },
                    ]}
                    selectedIds={[field.value]}
                    onSelectionChange={(selectedIds) => {
                      const value = selectedIds[0];
                      if (value === 'comfortable' || value === 'compact') field.onChange(value);
                    }}
                  />
                )}
              </FoundationControlledField>
            </div>
            <FoundationControlledField name="reduceMotion" form={form}>
              {(field) => (
                <SwitchField
                  label={t('preferences.reduceMotion')}
                  description={t('preferences.reduceMotionDescription')}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            </FoundationControlledField>
            <div>
              <Action type="submit" leadingIcon={<Save className="size-4" />}>
                {t('preferences.save')}
              </Action>
            </div>
          </FoundationForm>
        </Panel>
      </div>
    </PageTransition>
  );
}
