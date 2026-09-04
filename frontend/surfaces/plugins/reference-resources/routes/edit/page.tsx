'use client';

import { Page, PageHeader, Section } from '@community-go/surface-foundation/layout';
import { Action } from '@community-go/ui-adapter/action';
import { TextField } from '@community-go/ui-adapter/form-field';
import { FormActions } from '@community-go/surface-foundation/form-actions';
import { route, RouteLink } from '@community-go/plugin-framework/plugin';
import { useFrontendTranslation } from '@community-go/i18n';
import { useState } from 'react';

import { getReferenceResources } from '../../data';

export default function ReferenceResourcesEditPage() {
  const { t } = useFrontendTranslation();
  const resource = getReferenceResources()[0] ?? null;
  const [name, setName] = useState(resource?.name ?? '');

  return (
    <Page>
      <PageHeader
        eyebrow="Reference · File Routes"
        title={t('referenceResources.edit.title')}
        description={t('referenceResources.edit.description')}
        actions={
          <RouteLink target={route('reference-resources.detail')}>
            {t('referenceResources.edit.back')}
          </RouteLink>
        }
      />
      <Section title={t('referenceResources.edit.title')}>
        <form className="grid gap-5 p-5">
          <TextField
            label={t('referenceResources.common.name')}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <FormActions
            primary={<Action type="submit">{t('referenceResources.edit.submit')}</Action>}
            secondary={
              <RouteLink target={route('reference-resources.detail')}>
                {t('referenceResources.edit.cancel')}
              </RouteLink>
            }
          />
        </form>
      </Section>
    </Page>
  );
}
