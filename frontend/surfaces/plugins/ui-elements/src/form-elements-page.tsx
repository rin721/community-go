'use client';

import { DatePickerField } from '@community-go/ui-adapter/date-picker-field';
import {
  CheckboxField,
  ComboField,
  RadioGroupField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from '@community-go/ui-adapter/form-field';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { FormErrorSummary } from '@community-go/ui-adapter/form-error-summary';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFrontendTranslation } from '@community-go/i18n';
import { Section } from '@community-go/surface-foundation/layout';
import { ComponentPreview } from './component-preview';
import { UiElementsFamilyPage } from './family-page';

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
export function FormElementsPage() {
  const { t } = useFrontendTranslation();
  const searchParams = useSearchParams();
  const overlay = searchParams.get('overlay');
  const [checked, setChecked] = useState(true);
  const [selected, setSelected] = useState('guided');
  const [searchValue, setSearchValue] = useState('UI');
  return (
    <UiElementsFamilyPage
      familyId="forms"
      title={t('uiElements.fieldsTitle')}
      description={t('uiElements.fieldsDescription')}
    >
      {({ description, longText, setLongText, spacing }) => (
        <>
          <Section
            id="forms"
            title={t('uiElements.fieldsTitle')}
            description={t('uiElements.fieldsDescription')}
          >
            <div className={`grid p-5 lg:grid-cols-2 ${spacing}`}>
              <ComponentPreview
                fullWidth
                name="TextField"
                description={t('uiElements.catalog.textFieldDescription')}
                states={['Default', 'Hint', 'Invalid', 'Disabled', 'Placeholder', 'Long content']}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <TextField
                    label={t('uiElements.textField')}
                    hint={t('uiElements.fieldHint')}
                    placeholder={t('uiElements.placeholder')}
                  />
                  <TextField
                    label={t('uiElements.errorField')}
                    error={t('uiElements.errorMessage')}
                    defaultValue="x"
                  />
                  <TextField
                    label={t('uiElements.disabledField')}
                    disabled
                    defaultValue="readonly"
                  />
                </div>
              </ComponentPreview>
              <ComponentPreview
                name="TextAreaField"
                description={t('uiElements.catalog.textAreaDescription')}
                states={['Default', 'Hint / error', 'Disabled', 'Rows', 'Resize', 'Long content']}
              >
                <TextAreaField
                  label={t('uiElements.textArea')}
                  hint={t('uiElements.fieldHint')}
                  defaultValue={description}
                />
              </ComponentPreview>
              <ComponentPreview
                name="SearchBox"
                description={t('uiElements.catalog.searchBoxDescription')}
                states={['Value', 'Clear', 'Disabled', 'Accessible label']}
              >
                <div className="grid gap-3">
                  <SearchBox
                    label={t('reference.searchLabel')}
                    placeholder={t('reference.searchPlaceholder')}
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <SearchBox
                    disabled
                    label={t('uiElements.catalog.disabledSearch')}
                    placeholder={t('reference.searchPlaceholder')}
                  />
                </div>
              </ComponentPreview>
              <ComponentPreview
                name="SelectField"
                description={t('uiElements.catalog.selectDescription')}
                states={[
                  'Selected',
                  'Disabled option',
                  'Disabled field',
                  'Popup scroll',
                  'Keyboard',
                ]}
              >
                <div className="grid gap-3">
                  <SelectField
                    label={t('uiElements.select')}
                    hint={t('uiElements.selectionOverlayHint')}
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
                        label: t('uiElements.queueOption', { number: index + 1 }),
                      })),
                    ]}
                    value={selected}
                    onValueChange={setSelected}
                  />
                  <SelectField
                    disabled
                    label={t('uiElements.disabledField')}
                    options={[{ value: 'guided', label: t('formReference.modeOption.guided') }]}
                    value="guided"
                  />
                </div>
              </ComponentPreview>
              <ComponentPreview
                name="ComboField"
                description={t('uiElements.catalog.comboDescription')}
                states={['Filter', 'Selected', 'Disabled option', 'Disabled field', 'Popup scroll']}
              >
                <div className="grid gap-3">
                  <ComboField
                    label={t('uiElements.combobox')}
                    hint={t('uiElements.selectionOverlayHint')}
                    placeholder={t('uiElements.comboboxPlaceholder')}
                    options={ownerOptions.map((owner) => ({
                      value: owner,
                      label: owner,
                      disabled: owner === 'Omar Haddad',
                    }))}
                  />
                  <ComboField
                    disabled
                    label={t('uiElements.disabledField')}
                    placeholder={t('uiElements.comboboxPlaceholder')}
                    options={[]}
                  />
                </div>
              </ComponentPreview>
              <ComponentPreview
                name="DatePickerField"
                description={t('uiElements.catalog.dateDescription')}
                states={['Segments', 'Popup', 'Selected date', 'Disabled', 'Keyboard']}
              >
                <div className="grid gap-3">
                  <DatePickerField
                    label={t('uiElements.datePicker')}
                    hint={t('uiElements.overlayHint')}
                    calendarLabel={t('formReference.calendarLabel')}
                    defaultOpen={overlay === 'date'}
                  />
                  <DatePickerField
                    disabled
                    label={t('uiElements.disabledField')}
                    calendarLabel={t('formReference.calendarLabel')}
                  />
                </div>
              </ComponentPreview>
              <ComponentPreview
                name="CheckboxField"
                description={t('uiElements.catalog.checkboxDescription')}
                states={['Selected', 'Unselected', 'Description', 'Disabled']}
              >
                <div className="grid gap-3">
                  <CheckboxField
                    label={t('uiElements.checkbox')}
                    description={t('uiElements.checkboxDescription')}
                    checked={checked}
                    onCheckedChange={setChecked}
                  />
                  <CheckboxField
                    label={t('uiElements.disabledCheckbox')}
                    checked={false}
                    disabled
                  />
                </div>
              </ComponentPreview>
              <ComponentPreview
                name="RadioGroupField"
                description={t('uiElements.catalog.radioDescription')}
                states={['Selected', 'Disabled option', 'Hint / error', 'Keyboard']}
              >
                <RadioGroupField
                  label={t('uiElements.radioGroup')}
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
              </ComponentPreview>
              <ComponentPreview
                name="SwitchField"
                description={t('uiElements.catalog.switchDescription')}
                states={['On', 'Off', 'Disabled', 'Description']}
              >
                <div className="grid gap-3">
                  <SwitchField
                    label={t('uiElements.longText')}
                    description={t('uiElements.longTextDescription')}
                    checked={longText}
                    onCheckedChange={setLongText}
                  />
                  <SwitchField
                    disabled
                    label={t('uiElements.disabled')}
                    description={t('uiElements.catalog.disabledControlDescription')}
                    checked={false}
                    onCheckedChange={() => undefined}
                  />
                </div>
              </ComponentPreview>
              <ComponentPreview
                fullWidth
                name="FormErrorSummary"
                description="提交失败时汇总错误并恢复到对应字段；字段仍保留自己的 inline error。"
                states={['Empty', 'Multiple errors', 'Focus recovery', 'Live alert']}
              >
                <FormErrorSummary
                  errors={[
                    {
                      fieldId: 'name',
                      label: t('formReference.name'),
                      message: t('formReference.errors.name'),
                    },
                    {
                      fieldId: 'owner',
                      label: t('formReference.owner'),
                      message: t('formReference.errors.owner'),
                    },
                  ]}
                  title="请修正以下字段"
                />
              </ComponentPreview>
            </div>
          </Section>
        </>
      )}
    </UiElementsFamilyPage>
  );
}
