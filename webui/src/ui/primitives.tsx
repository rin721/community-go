import type { ReactNode } from "react";
import { Checkbox as RACCheckbox, Switch as RACSwitch } from "react-aria-components";

/** Check 是复选框原语（react-aria-components 底座，HeroUI v3 交互引擎）：
 * children 作为可访问名子节点；checked/onChange(boolean)/indeterminate 契约。
 * 091：原语独立成文件，供 index.tsx 与 data.tsx 等共享，避免统一层内部循环依赖。 */
export function Check({ children, checked, onChange, disabled, className = "", indeterminate = false }: { children: ReactNode; checked: boolean; onChange?: (checked: boolean) => void; disabled?: boolean; className?: string; indeterminate?: boolean }) {
  return <RACCheckbox isSelected={checked} isIndeterminate={indeterminate} isDisabled={disabled} onChange={(next) => onChange?.(next)} className={`rac-checkbox ${className}`.trim()}>{children}</RACCheckbox>;
}

/** Switch 是开关原语（react-aria-components 底座）：label 子节点提供可访问名，
 * ariaLabel 提供替代可访问名（配合外部视觉标签行）；视觉走 .rac-switch 平台类。 */
export function Switch({ label, ariaLabel, checked, onChange, disabled, className = "" }: { label?: ReactNode; ariaLabel?: string; checked: boolean; onChange?: (checked: boolean) => void; disabled?: boolean; className?: string }) {
  return <RACSwitch isSelected={checked} isDisabled={disabled} aria-label={ariaLabel} onChange={(next) => onChange?.(next)} className={`rac-switch ${className}`.trim()}>{label}</RACSwitch>;
}
