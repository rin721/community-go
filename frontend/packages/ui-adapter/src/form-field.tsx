import {
  Checkbox,
  ComboBox,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextArea,
  TextField as HeroTextField,
} from '@heroui/react';
import type { ChangeEvent, ReactNode } from 'react';

type FieldTextProps = Readonly<{
  label: string;
  hint?: string;
  error?: string;
}>;

const fieldRootClass = 'grid w-full gap-2 text-sm';
const fieldLabelClass = 'font-semibold text-ink';
const fieldControlClass =
  'min-h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm font-normal text-ink shadow-sm outline-none placeholder:text-ink-muted/70 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55 data-[focus-visible]:border-brand data-[invalid]:border-danger';
const fieldHintClass = 'text-xs font-normal leading-5 text-ink-muted';
const fieldErrorClass = 'text-xs font-medium leading-5 text-danger';
const popupClass =
  'max-h-72 min-w-56 overflow-auto rounded-panel border border-border bg-surface-raised p-1.5 text-ink shadow-overlay';
const optionClass =
  'flex min-h-10 cursor-default items-center justify-between gap-3 rounded-control px-3 py-2 text-sm outline-none data-[disabled]:opacity-45 data-[focused]:bg-surface-muted data-[selected]:bg-brand-soft data-[selected]:font-semibold data-[selected]:text-brand';

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
      className={fieldRootClass}
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      {...(name ? { name } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
    >
      <Label className={fieldLabelClass}>{label}</Label>
      <Input className={fieldControlClass} {...inputProps} />
      {error ? (
        <FieldError className={fieldErrorClass}>{error}</FieldError>
      ) : hint ? (
        <Description className={fieldHintClass}>{hint}</Description>
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
      className={fieldRootClass}
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      {...(name ? { name } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
    >
      <Label className={fieldLabelClass}>{label}</Label>
      <TextArea className={`${fieldControlClass} resize-y py-3`} rows={rows} {...inputProps} />
      {error ? (
        <FieldError className={fieldErrorClass}>{error}</FieldError>
      ) : hint ? (
        <Description className={fieldHintClass}>{hint}</Description>
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
      className={fieldRootClass}
      defaultOpen={defaultOpen}
      disabledKeys={disabledKeys}
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
      <Label className={fieldLabelClass}>{label}</Label>
      <Select.Trigger className={`${fieldControlClass} flex items-center justify-between gap-3`}>
        <Select.Value className="min-w-0 flex-1 truncate text-left" />
        <Select.Indicator className="size-4 shrink-0 text-ink-muted" />
      </Select.Trigger>
      {error ? (
        <FieldError className={fieldErrorClass}>{error}</FieldError>
      ) : hint ? (
        <Description className={fieldHintClass}>{hint}</Description>
      ) : null}
      <Select.Popover className={popupClass}>
        <ListBox className="outline-none">
          {options.map((option) => (
            <ListBox.Item
              className={optionClass}
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
  return (
    <ComboBox
      className={fieldRootClass}
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      menuTrigger="focus"
      onSelectionChange={(key) => {
        if (key !== null) onValueChange?.(String(key));
      }}
      {...(value !== undefined ? { selectedKey: value } : {})}
    >
      <Label className={fieldLabelClass}>{label}</Label>
      <ComboBox.InputGroup className={`${fieldControlClass} flex items-center gap-2 px-0`}>
        <Input
          className="min-w-0 flex-1 bg-transparent px-3.5 outline-none"
          placeholder={placeholder}
        />
        <ComboBox.Trigger className="mr-1 grid size-9 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-muted" />
      </ComboBox.InputGroup>
      {error ? (
        <FieldError className={fieldErrorClass}>{error}</FieldError>
      ) : hint ? (
        <Description className={fieldHintClass}>{hint}</Description>
      ) : null}
      <ComboBox.Popover className={popupClass}>
        <ListBox className="outline-none">
          {options.map((option) => (
            <ListBox.Item
              className={optionClass}
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

export type CheckboxFieldProps = Readonly<{
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}>;

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
      onChange={onCheckedChange}
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

export type FieldLabelProps = Readonly<{ children: ReactNode }>;
