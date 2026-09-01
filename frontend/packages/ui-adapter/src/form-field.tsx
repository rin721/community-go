import { Checkbox } from '@heroui/react/checkbox';
import { ComboBox } from '@heroui/react/combo-box';
import { Description } from '@heroui/react/description';
import { FieldError } from '@heroui/react/field-error';
import { Input } from '@heroui/react/input';
import { Label } from '@heroui/react/label';
import { ListBox } from '@heroui/react/list-box';
import { Radio } from '@heroui/react/radio';
import { RadioGroup } from '@heroui/react/radio-group';
import { Select } from '@heroui/react/select';
import { Switch } from '@heroui/react/switch';
import { TextArea } from '@heroui/react/textarea';
import { TextField as HeroTextField } from '@heroui/react/textfield';
import type { ChangeEvent, ReactNode } from 'react';

type FieldTextProps = Readonly<{
  label: string;
  hint?: string;
  error?: string;
}>;

type FieldValueProps =
  | Readonly<{ value: string; defaultValue?: never }>
  | Readonly<{ value?: never; defaultValue?: string }>;

export type TextFieldProps = FieldTextProps &
  FieldValueProps &
  Readonly<{
    name?: string;
    placeholder?: string;
    disabled?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  }>;

export function TextField({
  label,
  hint,
  error,
  disabled = false,
  name,
  value,
  defaultValue,
  ...inputProps
}: TextFieldProps) {
  return (
    <HeroTextField
      className="ui-field"
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      {...(name ? { name } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
    >
      <Label className="ui-field-label">{label}</Label>
      <Input className="ui-field-control" {...inputProps} />
      {error ? (
        <FieldError className="ui-field-error">{error}</FieldError>
      ) : hint ? (
        <Description className="ui-field-hint">{hint}</Description>
      ) : null}
    </HeroTextField>
  );
}

export type TextAreaFieldProps = FieldTextProps &
  FieldValueProps &
  Readonly<{
    name?: string;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  }>;

export function TextAreaField({
  label,
  hint,
  error,
  disabled = false,
  rows = 4,
  name,
  value,
  defaultValue,
  ...inputProps
}: TextAreaFieldProps) {
  return (
    <HeroTextField
      className="ui-field"
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      {...(name ? { name } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
    >
      <Label className="ui-field-label">{label}</Label>
      <TextArea className="ui-field-control resize-y py-3" rows={rows} {...inputProps} />
      {error ? (
        <FieldError className="ui-field-error">{error}</FieldError>
      ) : hint ? (
        <Description className="ui-field-hint">{hint}</Description>
      ) : null}
    </HeroTextField>
  );
}

export type SelectOption = Readonly<{
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}>;

export type SelectFieldProps = FieldTextProps &
  Readonly<{
    name?: string;
    value?: string | null;
    defaultValue?: string;
    options: readonly SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    defaultOpen?: boolean;
    onValueChange?: (value: string) => void;
  }>;

export function SelectField({
  label,
  hint,
  error,
  options,
  value,
  defaultValue,
  placeholder,
  disabled = false,
  defaultOpen = false,
  onValueChange,
  name,
}: SelectFieldProps) {
  const disabledKeys = options.filter((option) => option.disabled).map((option) => option.value);
  return (
    <Select
      className="ui-field"
      defaultOpen={defaultOpen}
      disabledKeys={disabledKeys}
      fullWidth
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      onChange={(key) => {
        if (key !== null) onValueChange?.(String(key));
      }}
      {...(defaultValue ? { defaultValue } : {})}
      {...(name ? { name } : {})}
      {...(placeholder ? { placeholder } : {})}
      {...(value !== undefined ? { value } : {})}
    >
      <Label className="ui-field-label">{label}</Label>
      <Select.Trigger className="ui-field-control flex items-center justify-between gap-3">
        <Select.Value className="min-w-0 flex-1 truncate text-left" />
        <Select.Indicator className="size-4 shrink-0 text-ink-muted" />
      </Select.Trigger>
      {error ? (
        <FieldError className="ui-field-error">{error}</FieldError>
      ) : hint ? (
        <Description className="ui-field-hint">{hint}</Description>
      ) : null}
      <Select.Popover className="ui-overlay-surface ui-anchored-overlay-match-trigger">
        <ListBox className="ui-listbox">
          {options.map((option) => (
            <ListBox.Item
              className="ui-option"
              id={option.value}
              key={option.value}
              textValue={option.label}
            >
              <span className="min-w-0">
                <Label className="block truncate font-medium">{option.label}</Label>
                {option.description ? (
                  <Description className="mt-0.5 block text-xs text-ink-muted">
                    {option.description}
                  </Description>
                ) : null}
              </span>
              <ListBox.ItemIndicator className="text-brand" />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export type ComboFieldProps = FieldTextProps &
  Readonly<{
    value?: string | null;
    options: readonly SelectOption[];
    placeholder: string;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
  }>;

export function ComboField({
  label,
  hint,
  error,
  value,
  options,
  placeholder,
  disabled = false,
  onValueChange,
}: ComboFieldProps) {
  const disabledKeys = options.filter((option) => option.disabled).map((option) => option.value);
  return (
    <ComboBox
      className="ui-field"
      disabledKeys={disabledKeys}
      fullWidth
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      menuTrigger="focus"
      onSelectionChange={(key) => {
        if (key !== null) onValueChange?.(String(key));
      }}
      {...(value !== undefined ? { selectedKey: value } : {})}
    >
      <Label className="ui-field-label">{label}</Label>
      <ComboBox.InputGroup>
        <Input
          className="ui-field-control min-w-0 flex-1 pe-7"
          fullWidth
          placeholder={placeholder}
        />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      {error ? (
        <FieldError className="ui-field-error">{error}</FieldError>
      ) : hint ? (
        <Description className="ui-field-hint">{hint}</Description>
      ) : null}
      <ComboBox.Popover className="ui-overlay-surface ui-anchored-overlay-match-trigger">
        <ListBox className="ui-listbox">
          {options.map((option) => (
            <ListBox.Item
              className="ui-option"
              id={option.value}
              key={option.value}
              textValue={option.label}
            >
              <Label className="truncate">{option.label}</Label>
              <ListBox.ItemIndicator className="text-brand" />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}

export type SwitchFieldProps = Readonly<{
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}>;

export function SwitchField({
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: SwitchFieldProps) {
  return (
    <Switch
      className="group flex items-start justify-between gap-4 rounded-panel border border-border bg-surface p-4"
      isDisabled={disabled}
      isSelected={checked}
      onChange={onCheckedChange}
    >
      <Switch.Content className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-ink-muted">{description}</span>
      </Switch.Content>
      <Switch.Control className="mt-1 flex h-6 w-11 shrink-0 items-center rounded-full bg-border-strong p-0.5 transition-colors group-data-[selected=true]:bg-brand">
        <Switch.Thumb className="size-5 rounded-full bg-surface shadow-sm" />
      </Switch.Control>
    </Switch>
  );
}

type CheckboxChangeProps =
  | Readonly<{ disabled: true; onCheckedChange?: never }>
  | Readonly<{ disabled?: false; onCheckedChange: (checked: boolean) => void }>
  | Readonly<{ disabled: boolean; onCheckedChange: (checked: boolean) => void }>;

export type CheckboxFieldProps = Readonly<{
  label: string;
  description?: string;
  checked: boolean;
}> &
  CheckboxChangeProps;

export function CheckboxField({
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: CheckboxFieldProps) {
  return (
    <Checkbox
      className="flex items-start gap-3 text-sm"
      isDisabled={disabled}
      isSelected={checked}
      {...(onCheckedChange ? { onChange: onCheckedChange } : {})}
    >
      <Checkbox.Control className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-border-strong bg-surface text-white data-[selected]:border-brand data-[selected]:bg-brand">
        <Checkbox.Indicator>✓</Checkbox.Indicator>
      </Checkbox.Control>
      <Checkbox.Content className="min-w-0">
        <span className="block font-semibold text-ink">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-ink-muted">{description}</span>
        ) : null}
      </Checkbox.Content>
    </Checkbox>
  );
}

export type RadioOption = Readonly<{
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}>;

export type RadioGroupFieldProps = FieldTextProps &
  Readonly<{
    value: string;
    options: readonly RadioOption[];
    disabled?: boolean;
    onValueChange: (value: string) => void;
  }>;

export function RadioGroupField({
  label,
  hint,
  error,
  value,
  options,
  disabled = false,
  onValueChange,
}: RadioGroupFieldProps) {
  return (
    <RadioGroup
      className="ui-field"
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      value={value}
      onChange={onValueChange}
    >
      <Label className="ui-field-label">{label}</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <Radio
            className="group flex min-h-20 items-start gap-3 rounded-panel border border-border bg-surface p-4 text-sm data-[selected]:border-brand data-[selected]:bg-brand-soft"
            key={option.value}
            value={option.value}
            {...(option.disabled ? { isDisabled: true } : {})}
          >
            <Radio.Control className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border-strong bg-surface group-data-[selected]:border-brand">
              <Radio.Indicator className="size-2.5 rounded-full bg-brand" />
            </Radio.Control>
            <Radio.Content className="min-w-0">
              <span className="block font-semibold text-ink">{option.label}</span>
              {option.description ? (
                <span className="mt-1 block text-xs leading-5 text-ink-muted">
                  {option.description}
                </span>
              ) : null}
            </Radio.Content>
          </Radio>
        ))}
      </div>
      {error ? (
        <FieldError className="ui-field-error">{error}</FieldError>
      ) : hint ? (
        <Description className="ui-field-hint">{hint}</Description>
      ) : null}
    </RadioGroup>
  );
}

export type FieldLabelProps = Readonly<{ children: ReactNode }>;
