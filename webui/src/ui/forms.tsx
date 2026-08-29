import type { InputHTMLAttributes, ReactNode } from "react";
import { Description, FieldError, Input as HeroInput, Label, ListBox, NumberField as HeroNumberField, SearchField as HeroSearchField, Select, TextArea as HeroTextArea, TextField } from "@heroui/react";
import { Button as RACButton, FileTrigger } from "react-aria-components";

/** 表单字段宽度档位由平台 token 控制，业务页只选择语义档位。 */
export type FieldWidth = "sm" | "md" | "lg" | "auto";

export function fieldWidthClass(width: FieldWidth = "auto"): string {
  return width === "sm" ? "field-width-sm" : width === "md" ? "field-width-md" : width === "lg" ? "field-width-lg" : "";
}

/** Field 复用 HeroUI TextField/Input，并保留原生 input 事件契约。 */
export type TextFieldInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { type?: "text" | "email" | "password" | "url" | "tel" };

export function Field({ label, hint, error, className = "", description, width = "auto", optional, ...props }: TextFieldInputProps & { label: string; hint?: string; error?: string; description?: string; width?: FieldWidth; optional?: boolean }) {
  return <div className={`form-field ${error ? "has-error" : ""} ${fieldWidthClass(width)}`.trim()}><TextField isInvalid={Boolean(error)}><Label>{label}{optional && <span className="form-field-optional">（可选）</span>}</Label><HeroInput className={className} {...props as object} />{hint && <Description>{hint}</Description>}{description && !hint && <Description>{description}</Description>}{error && <FieldError>{error}</FieldError>}</TextField></div>;
}

/** SearchControl 使用 HeroUI SearchField，调用方只管理字符串值。 */
export function SearchControl({ value, onValueChange, label, placeholder, className = "", autoFocus, inputRef, onKeyDown }: { value: string; onValueChange: (value: string) => void; label: string; placeholder?: string; className?: string; autoFocus?: boolean; inputRef?: React.Ref<HTMLInputElement>; onKeyDown?: React.KeyboardEventHandler<HTMLInputElement> }) {
  return <HeroSearchField value={value} onChange={onValueChange} aria-label={label} className={className}><HeroSearchField.Group><HeroSearchField.SearchIcon /><HeroSearchField.Input ref={inputRef} autoFocus={autoFocus} placeholder={placeholder} onKeyDown={onKeyDown} /><HeroSearchField.ClearButton /></HeroSearchField.Group></HeroSearchField>;
}

/** NumberField 显式使用 number/null，避免页面通过字符串 input 隐式解释数值。 */
export function NumberField({ label, value, onValueChange, minValue, maxValue, step, placeholder, disabled, className = "" }: { label: string; value: number | null; onValueChange: (value: number | null) => void; minValue?: number; maxValue?: number; step?: number; placeholder?: string; disabled?: boolean; className?: string }) {
  return <div className={`form-field ${className}`.trim()}><HeroNumberField value={value ?? undefined} onChange={(next) => onValueChange(Number.isNaN(next) ? null : next)} minValue={minValue} maxValue={maxValue} step={step} isDisabled={disabled}><Label>{label}</Label><HeroNumberField.Group><HeroNumberField.Input placeholder={placeholder} /><HeroNumberField.DecrementButton aria-label={`${label} -`}>−</HeroNumberField.DecrementButton><HeroNumberField.IncrementButton aria-label={`${label} +`}>+</HeroNumberField.IncrementButton></HeroNumberField.Group></HeroNumberField></div>;
}

function NativeDateField({ label, value, onValueChange, type, required, disabled, className = "" }: { label: string; value: string; onValueChange: (value: string) => void; type: "date" | "datetime-local"; required?: boolean; disabled?: boolean; className?: string }) {
  return <div className={`form-field ${className}`.trim()}><TextField><Label>{label}</Label><HeroInput type={type} value={value} required={required} disabled={disabled} onChange={(event) => onValueChange(event.target.value)} /></TextField></div>;
}

export function DateField(props: Omit<Parameters<typeof NativeDateField>[0], "type">) { return <NativeDateField {...props} type="date" />; }
export function DateTimeField(props: Omit<Parameters<typeof NativeDateField>[0], "type">) { return <NativeDateField {...props} type="datetime-local" />; }

/** FilePicker 通过 RAC FileTrigger 持有浏览器文件 input，不向页面暴露原生控件。 */
export function FilePicker({ label, onFilesChange, accept, multiple = false, disabled = false, className = "" }: { label: string; onFilesChange: (files: FileList | null) => void; accept?: string; multiple?: boolean; disabled?: boolean; className?: string }) {
  return <FileTrigger onSelect={onFilesChange} acceptedFileTypes={accept ? accept.split(",").map((value) => value.trim()).filter(Boolean) : undefined} allowsMultiple={multiple}><RACButton isDisabled={disabled} className={`ui-button ui-button-secondary ${className}`.trim()}>{label}</RACButton></FileTrigger>;
}

/** FilterTextField 是筛选区紧凑 HeroUI TextField。 */
export function FilterTextField({ label, value, onValueChange, placeholder }: { label: ReactNode; value: string; onValueChange: (value: string) => void; placeholder?: string }) {
  return <div className="filter-field"><span className="filter-field-label">{label}</span><TextField aria-label={typeof label === "string" ? label : undefined}><HeroInput value={value} placeholder={placeholder} onChange={(event) => onValueChange(event.target.value)} /></TextField></div>;
}

export function TextAreaField({ label, value, onValueChange, rows = 5, disabled = false, className = "" }: { label: string; value: string; onValueChange: (value: string) => void; rows?: number; disabled?: boolean; className?: string }) {
  return <div className={`form-field ${className}`.trim()}><TextField><Label>{label}</Label><HeroTextArea value={value} onChange={(event) => onValueChange(event.target.value)} rows={rows} disabled={disabled} /></TextField></div>;
}

/** FormField 规范化 Label/Control/Description/Helper/Error 结构，可包裹任意控件。 */
export function FormField({ label, control, description, helper, error, width = "auto", optional, htmlFor }: {
  label: ReactNode;
  control: ReactNode;
  description?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  width?: FieldWidth;
  optional?: boolean;
  htmlFor?: string;
}) {
  return <div className={`form-field ${error ? "has-error" : ""} ${fieldWidthClass(width)}`.trim()}><label className="form-field-label" htmlFor={htmlFor}>{label}{optional && <span className="form-field-optional">（可选）</span>}</label>{control}{description && <p className="form-field-description">{description}</p>}{helper && <p className="form-field-helper">{helper}</p>}{error && <p className="form-field-error" role="alert">{error}</p>}</div>;
}

export type SelectOption = { value: string; label: ReactNode };

// React Aria 将空字符串视为“未选择”，但后台筛选器普遍用空字符串表达
// “全部/不限”。为这类业务值生成仅限组件内部使用的稳定 key，避免触发器
// 视觉为空，同时保持业务页面既有的空字符串查询契约。
function emptyOptionKey(options: ReadonlyArray<SelectOption>): string | null {
  if (!options.some((option) => option.value === "")) return null;
  const values = new Set(options.map((option) => option.value));
  let key = "__webui_empty_option__";
  while (values.has(key)) key += "_";
  return key;
}

function selectKey(value: string, emptyKey: string | null): string | null {
  return value === "" ? emptyKey : value;
}

/** SelectField 是带统一 Label/Trigger/ListBox 的选择字段。 */
export function SelectField({ label, value, options, onValueChange, className = "", placeholder, error }: { label: string; value: string; options: ReadonlyArray<SelectOption>; onValueChange: (value: string) => void; className?: string; placeholder?: string; error?: string }) {
  const emptyKey = emptyOptionKey(options);
  return <div className={`form-field ${error ? "has-error" : ""}`.trim()}><Select selectedKey={selectKey(value, emptyKey)} onSelectionChange={(key) => onValueChange(key === null || key === undefined || key === emptyKey ? "" : String(key))} className={className} isInvalid={Boolean(error)}><Label>{label}</Label><Select.Trigger><Select.Value>{({ selectedText }) => selectedText ?? placeholder ?? ""}</Select.Value></Select.Trigger><Select.Indicator /><Select.Popover><ListBox className="max-h-72 overflow-auto">{options.map((option) => <ListBox.Item key={option.value || emptyKey} id={option.value || emptyKey || undefined} textValue={typeof option.label === "string" ? option.label : String(option.label)}>{option.label}</ListBox.Item>)}</ListBox></Select.Popover></Select></div>;
}

/** FilterSelect 是筛选/分页等紧凑场景的选择控件（091：替代原生 `<select>`）。
 * 行内标签 + HeroUI Select Trigger，与表单 SelectField 同源（同一成熟实现），
 * 仅形态为紧凑行内；不承载 Label 浮动，保持筛选区控件高度/圆角一致。
 */
export function FilterSelect({ label, value, options, onValueChange, className = "", ariaLabel }: {
  label?: ReactNode;
  value: string;
  options: ReadonlyArray<SelectOption>;
  onValueChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const emptyKey = emptyOptionKey(options);
  return (
    <label className={`filter-select ${className}`.trim()}>
      {label && <span className="filter-select-label">{label}</span>}
      <Select selectedKey={selectKey(value, emptyKey)} onSelectionChange={(key) => onValueChange(key === null || key === undefined || key === emptyKey ? "" : String(key))} className="filter-select-control" aria-label={ariaLabel}>
        <Select.Trigger><Select.Value>{({ selectedText }) => selectedText ?? ""}</Select.Value></Select.Trigger>
        <Select.Indicator />
        <Select.Popover><ListBox className="max-h-72 overflow-auto">{options.map((option) => <ListBox.Item key={option.value || emptyKey} id={option.value || emptyKey || undefined} textValue={typeof option.label === "string" ? option.label : String(option.label)}>{option.label}</ListBox.Item>)}</ListBox></Select.Popover>
      </Select>
    </label>
  );
}
