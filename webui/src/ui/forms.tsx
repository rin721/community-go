import type { InputHTMLAttributes, ReactNode } from "react";
import { Description, FieldError, Input as HeroInput, Label, ListBox, Select, TextField } from "@heroui/react";

/** 表单字段宽度档位由平台 token 控制，业务页只选择语义档位。 */
export type FieldWidth = "sm" | "md" | "lg" | "auto";

export function fieldWidthClass(width: FieldWidth = "auto"): string {
  return width === "sm" ? "field-width-sm" : width === "md" ? "field-width-md" : width === "lg" ? "field-width-lg" : "";
}

/** Field 复用 HeroUI TextField/Input，并保留原生 input 事件契约。 */
export function Field({ label, hint, error, className = "", description, width = "auto", optional, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; description?: string; width?: FieldWidth; optional?: boolean }) {
  return <div className={`form-field ${error ? "has-error" : ""} ${fieldWidthClass(width)}`.trim()}><TextField isInvalid={Boolean(error)}><Label>{label}{optional && <span className="form-field-optional">（可选）</span>}</Label><HeroInput className={className} {...props as object} />{hint && <Description>{hint}</Description>}{description && !hint && <Description>{description}</Description>}{error && <FieldError>{error}</FieldError>}</TextField></div>;
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

/** SelectField 是带统一 Label/Trigger/ListBox 的选择字段。 */
export function SelectField({ label, value, options, onValueChange, className = "", placeholder, error }: { label: string; value: string; options: ReadonlyArray<SelectOption>; onValueChange: (value: string) => void; className?: string; placeholder?: string; error?: string }) {
  return <div className={`form-field ${error ? "has-error" : ""}`.trim()}><Select selectedKey={value} onSelectionChange={(key) => onValueChange(key === null || key === undefined ? "" : String(key))} className={className} isInvalid={Boolean(error)}><Label>{label}</Label><Select.Trigger><Select.Value>{({ selectedText }) => selectedText ?? placeholder ?? ""}</Select.Value></Select.Trigger><Select.Indicator /><Select.Popover><ListBox className="max-h-72 overflow-auto">{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={typeof option.label === "string" ? option.label : String(option.label)}>{option.label}</ListBox.Item>)}</ListBox></Select.Popover></Select></div>;
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
  return (
    <label className={`filter-select ${className}`.trim()}>
      {label && <span className="filter-select-label">{label}</span>}
      <Select selectedKey={value || null} onSelectionChange={(key) => onValueChange(key === null || key === undefined ? "" : String(key))} className="filter-select-control" aria-label={ariaLabel}>
        <Select.Trigger><Select.Value>{({ selectedText }) => selectedText ?? ""}</Select.Value></Select.Trigger>
        <Select.Indicator />
        <Select.Popover><ListBox className="max-h-72 overflow-auto">{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={typeof option.label === "string" ? option.label : String(option.label)}>{option.label}</ListBox.Item>)}</ListBox></Select.Popover>
      </Select>
    </label>
  );
}
