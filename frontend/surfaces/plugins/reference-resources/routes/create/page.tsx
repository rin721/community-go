'use client';

import { Page, PageHeader, Section } from '@community-go/surface-foundation/layout';
import { Action } from '@community-go/ui-adapter/action';
import { SelectField, TextField } from '@community-go/ui-adapter/form-field';
import { FormActions } from '@community-go/surface-foundation/form-actions';
import { route, RouteLink, usePluginNavigation } from '@community-go/plugin-framework/plugin';
import { useFrontendTranslation } from '@community-go/i18n';
import { useState } from 'react';

export default function ReferenceResourcesCreatePage() {
  const { t } = useFrontendTranslation();
  const { navigate } = usePluginNavigation();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('sample');

  return (
    <Page>
      <PageHeader
        eyebrow="Reference · File Routes"
        title={t('referenceResources.create.title')}
        description={t('referenceResources.create.description')}
        actions={
          <RouteLink target={route('reference-resources')}>
            {t('referenceResources.create.back')}
          </RouteLink>
        }
      />
      <Section title={t('referenceResources.create.title')}>
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
          <FormActions
            primary={<Action type="submit">{t('referenceResources.create.submit')}</Action>}
            secondary={
              <RouteLink target={route('reference-resources')}>
                {t('referenceResources.create.cancel')}
              </RouteLink>
            }
          />
        </form>
      </Section>
    </Page>
  );
}
