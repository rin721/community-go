import { preferencesSchema, type PreferencesInput } from '@community-go/schemas';
import {
  Action,
  Panel,
  SelectField,
  StatusPill,
  SwitchField,
  TextField,
  ToggleGroup,
  useFeedback,
} from '@community-go/ui-adapter';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '../../layouts/page-layout';
import { useShellStore } from '../../state/use-shell-store';

export function PreferencesScreen() {
  const { t } = useTranslation();
  const locale = useShellStore((state) => state.locale);
  const setLocale = useShellStore((state) => state.setLocale);
  const { notify } = useFeedback();
  const [saved, setSaved] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PreferencesInput>({
    resolver: zodResolver(preferencesSchema),
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
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('preferences.eyebrow')}
        title={t('preferences.title')}
        description={t('preferences.description')}
        actions={
          saved ? <StatusPill tone="success">{t('preferences.saved')}</StatusPill> : undefined
        }
      />
      <Panel className="max-w-3xl p-5 sm:p-7">
        <form className="grid gap-6" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <TextField
            label={t('preferences.name')}
            hint={t('preferences.nameHint')}
            {...(errors.interfaceName ? { error: t('preferences.nameError') } : {})}
            {...register('interfaceName')}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              name="locale"
              control={control}
              render={({ field }) => (
                <SelectField
                  label={t('preferences.locale')}
                  hint={t('preferences.localeHint')}
                  options={[
                    { value: 'zh-CN', label: '简体中文' },
                    { value: 'en', label: 'English' },
                  ]}
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <Controller
              name="density"
              control={control}
              render={({ field }) => (
                <ToggleGroup
                  label={t('preferences.density')}
                  description={t('preferences.densityHint')}
                  options={[
                    { id: 'comfortable', label: t('preferences.comfortable') },
                    { id: 'compact', label: t('preferences.compact') },
                  ]}
                  selectedIds={[field.value]}
                  onSelectionChange={(selectedIds) => field.onChange(selectedIds[0] ?? field.value)}
                />
              )}
            />
          </div>
          <Controller
            name="reduceMotion"
            control={control}
            render={({ field }) => (
              <SwitchField
                label={t('preferences.reduceMotion')}
                description={t('preferences.reduceMotionDescription')}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <div>
            <Action type="submit" leadingIcon={<Save className="size-4" />}>
              {t('preferences.save')}
            </Action>
          </div>
        </form>
      </Panel>
    </div>
  );
}
