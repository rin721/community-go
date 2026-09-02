'use client';

import { AdminPage, AdminPageHeader, AdminSection } from '@community-go/admin-foundation/layout';
import { Action } from '@community-go/ui-adapter/action';
import { SelectField, TextField } from '@community-go/ui-adapter/form-field';
import { AdminFormActions } from '@community-go/admin-foundation/form-actions';
import { route, AdminRouteLink, useAdminNavigation } from '@community-go/admin-framework/plugin';
import { useFrontendTranslation } from '@community-go/i18n';
import { useState } from 'react';

export function ReferenceResourcesCreatePage() {
  const { t } = useFrontendTranslation();
  const { navigate } = useAdminNavigation();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('sample');

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Reference · File Routes"
        title={t('referenceResources.create.title')}
        description={t('referenceResources.create.description')}
        actions={
          <AdminRouteLink target={route('reference-resources')}>
            {t('referenceResources.create.back')}
          </AdminRouteLink>
        }
      />
      <AdminSection title={t('referenceResources.create.title')}>
        <form
          className="grid gap-5 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void navigate(route('reference-resources'));
          }}
        >
          <TextField
            label={t('referenceResources.common.name')}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <SelectField
            label={t('referenceResources.common.kind')}
            options={[
              { label: t('referenceResources.common.sample'), value: 'sample' },
              { label: 'Guide', value: 'guide' },
              { label: 'Template', value: 'template' },
            ]}
            value={kind}
            onValueChange={setKind}
          />
          <AdminFormActions
            primary={<Action type="submit">{t('referenceResources.create.submit')}</Action>}
            secondary={
              <AdminRouteLink target={route('reference-resources')}>
                {t('referenceResources.create.cancel')}
              </AdminRouteLink>
            }
          />
        </form>
      </AdminSection>
    </AdminPage>
  );
}
