'use client';

import { AdminPage, AdminPageHeader, AdminSection } from '@community-go/admin-foundation/layout';
import { Action } from '@community-go/ui-adapter/action';
import { TextField } from '@community-go/ui-adapter/form-field';
import { AdminFormActions } from '@community-go/admin-foundation/form-actions';
import { route, AdminRouteLink } from '@community-go/admin-framework/plugin';
import { useFrontendTranslation } from '@community-go/i18n';
import { useState } from 'react';

import { getReferenceResources } from '../../data';

export default function ReferenceResourcesEditPage() {
  const { t } = useFrontendTranslation();
  const resource = getReferenceResources()[0] ?? null;
  const [name, setName] = useState(resource?.name ?? '');

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Reference · File Routes"
        title={t('referenceResources.edit.title')}
        description={t('referenceResources.edit.description')}
        actions={
          <AdminRouteLink target={route('reference-resources.detail')}>
            {t('referenceResources.edit.back')}
          </AdminRouteLink>
        }
      />
      <AdminSection title={t('referenceResources.edit.title')}>
        <form className="grid gap-5 p-5">
          <TextField
            label={t('referenceResources.common.name')}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <AdminFormActions
            primary={<Action type="submit">{t('referenceResources.edit.submit')}</Action>}
            secondary={
              <AdminRouteLink target={route('reference-resources.detail')}>
                {t('referenceResources.edit.cancel')}
              </AdminRouteLink>
            }
          />
        </form>
      </AdminSection>
    </AdminPage>
  );
}
