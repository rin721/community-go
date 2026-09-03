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
import { AdminPageHeader } from '@community-go/admin-foundation/layout';
import { useAdminLocale } from '@community-go/admin-framework/plugin';
import { useFrontendTranslation } from '@community-go/i18n';
import { useState } from 'react';

import type { PreferencesInput } from '../../schemas';

/**
 * 偏好设置 —— 从 Host apps/admin-web 迁入 system-tools Plugin。
 *
 * 真实 Host-private 依赖审计结果：原页面只依赖 Host shell store 的
 * locale/setLocale（theme/density/reduceMotion 字段本页不写 store）。
 * 迁移后经 AdminLocaleProvider 注入的 useAdminLocale（Plugin Locale Port）读写，
 * 不再依赖 Host store；文案用 plugin i18n（systemTools.preferences.*）；
 * schema 随插件走（../../schemas），并经 async factory 动态加载以拆分 zod chunk
 * （与迁入前 Host 页的 dynamic import 行为一致）。
 */
export function SystemToolsPreferencesPage() {
  const { t } = useFrontendTranslation();
  const { locale, changeLocale } = useAdminLocale();
  const { notify } = useFeedback();
  const [saved, setSaved] = useState(false);
  const initialLocale: PreferencesInput['locale'] = locale === 'en' ? 'en' : 'zh-CN';
  const form = useFoundationForm<PreferencesInput>({
    schema: async () => (await import('../../schemas')).preferencesSchema,
    defaultValues: {
      interfaceName: 'Community Console',
      locale: initialLocale,
      density: 'comfortable',
      reduceMotion: false,
    },
  });

  const onSubmit = (values: PreferencesInput) => {
    changeLocale(values.locale);
    setSaved(true);
    notify({
      title: t('systemTools.preferences.saved'),
      description: t('systemTools.preferences.description'),
      tone: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t('systemTools.preferences.eyebrow')}
        title={t('systemTools.preferences.title')}
        description={t('systemTools.preferences.description')}
        actions={
          saved ? (
            <StatusPill tone="success">{t('systemTools.preferences.saved')}</StatusPill>
          ) : undefined
        }
      />
      <Panel className="max-w-3xl p-5 sm:p-7">
        <FoundationForm className="grid gap-6" form={form} onSubmit={onSubmit}>
          <TextField
            label={t('systemTools.preferences.name')}
            hint={t('systemTools.preferences.nameHint')}
            {...(form.hasError('interfaceName')
              ? { error: t('systemTools.preferences.nameError') }
              : {})}
            {...form.registerField('interfaceName')}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FoundationControlledField name="locale" form={form}>
              {(field) => (
                <SelectField
                  label={t('systemTools.preferences.locale')}
                  hint={t('systemTools.preferences.localeHint')}
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
                  label={t('systemTools.preferences.density')}
                  description={t('systemTools.preferences.densityHint')}
                  options={[
                    { id: 'comfortable', label: t('systemTools.preferences.comfortable') },
                    { id: 'compact', label: t('systemTools.preferences.compact') },
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
                label={t('systemTools.preferences.reduceMotion')}
                description={t('systemTools.preferences.reduceMotionDescription')}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          </FoundationControlledField>
          <div>
            <Action type="submit">{t('systemTools.preferences.save')}</Action>
          </div>
        </FoundationForm>
      </Panel>
    </div>
  );
}
