import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

type FieldFrameProps = Readonly<{
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}>;

function FieldFrame({ label, hint, error, children }: FieldFrameProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      <span>{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs font-normal leading-5 text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export type TextFieldProps = Readonly<{
  label: string;
  hint?: string;
  error?: string;
}> &
  Pick<
    InputHTMLAttributes<HTMLInputElement>,
    'name' | 'value' | 'defaultValue' | 'placeholder' | 'onChange'
  >;

export function TextField({ label, hint, error, ...inputProps }: TextFieldProps) {
  return (
    <FieldFrame label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}>
      <input
        className="h-11 rounded-control border border-border bg-surface px-3.5 font-normal text-ink shadow-sm placeholder:text-ink-muted/70"
        aria-invalid={Boolean(error)}
        {...inputProps}
      />
    </FieldFrame>
  );
}

export type SelectFieldProps = Readonly<{
  label: string;
  hint?: string;
  options: readonly Readonly<{ label: string; value: string }>[];
}> &
  Pick<SelectHTMLAttributes<HTMLSelectElement>, 'name' | 'value' | 'defaultValue' | 'onChange'>;

export function SelectField({ label, hint, options, ...selectProps }: SelectFieldProps) {
  return (
    <FieldFrame label={label} {...(hint ? { hint } : {})}>
      <select
        className="h-11 rounded-control border border-border bg-surface px-3.5 font-normal text-ink shadow-sm"
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export type SwitchFieldProps = Readonly<{
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}>;

export function SwitchField({ label, description, checked, onCheckedChange }: SwitchFieldProps) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  return (
    <div className="flex items-start justify-between gap-4 rounded-panel border border-border bg-surface p-4">
      <span>
        <label className="block cursor-pointer text-sm font-semibold text-ink" htmlFor={inputId}>
          {label}
        </label>
        <span id={descriptionId} className="mt-1 block text-xs leading-5 text-ink-muted">
          {description}
        </span>
      </span>
      <input
        id={inputId}
        aria-describedby={descriptionId}
        className="mt-1 size-4 accent-brand"
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
      />
    </div>
  );
}
