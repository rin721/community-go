import type { KeyboardEventHandler, ReactNode, RefObject } from "react";
import { Avatar as HeroAvatar } from "@heroui/react";
import { Button as RACButton, Checkbox as RACCheckbox, Disclosure as RACDisclosure, DisclosurePanel, ListBox, ListBoxItem, Menu, MenuItem, MenuTrigger, Popover, Radio, RadioGroup as RACRadioGroup, Switch as RACSwitch, Tab, TabList, TabPanel, TabPanels, Tabs as RACTabs, ToggleButton as RACToggleButton, Tooltip as RACTooltip, TooltipTrigger } from "react-aria-components";

/** Check 是复选框原语（react-aria-components 底座，HeroUI v3 交互引擎）：
 * children 作为可访问名子节点；checked/onChange(boolean)/indeterminate 契约；
 * ariaLabel 提供替代可访问名（无可见标签的场景，如图表内表格选择）。
 * 091：原语独立成文件，供 index.tsx 与 data.tsx 等共享，避免统一层内部循环依赖。 */
export function Check({ children, checked, onChange, disabled, className = "", indeterminate = false, ariaLabel }: { children?: ReactNode; checked: boolean; onChange?: (checked: boolean) => void; disabled?: boolean; className?: string; indeterminate?: boolean; ariaLabel?: string }) {
  return <RACCheckbox slot={ariaLabel ? "selection" : undefined} isSelected={checked} isIndeterminate={indeterminate} isDisabled={disabled} aria-label={ariaLabel} onChange={(next) => onChange?.(next)} className={`rac-checkbox ${className}`.trim()}>{children ?? <span className="sr-only">{ariaLabel}</span>}</RACCheckbox>;
}

/** Switch 是开关原语（react-aria-components 底座）：label 子节点提供可访问名，
 * ariaLabel 提供替代可访问名（配合外部视觉标签行）；视觉走 .rac-switch 平台类。 */
export function Switch({ label, ariaLabel, checked, onChange, disabled, className = "" }: { label?: ReactNode; ariaLabel?: string; checked: boolean; onChange?: (checked: boolean) => void; disabled?: boolean; className?: string }) {
  return <RACSwitch isSelected={checked} isDisabled={disabled} aria-label={ariaLabel} onChange={(next) => onChange?.(next)} className={`rac-switch ${className}`.trim()}>{label}</RACSwitch>;
}

export function ToggleButton({ children, selected, onChange, disabled, className = "", ariaLabel }: { children: ReactNode; selected: boolean; onChange: (selected: boolean) => void; disabled?: boolean; className?: string; ariaLabel?: string }) {
  return <RACToggleButton isSelected={selected} onChange={onChange} isDisabled={disabled} aria-label={ariaLabel} className={`ui-toggle-button ${className}`.trim()}>{children}</RACToggleButton>;
}

export type ChoiceOption = { value: string; label: ReactNode };

export function RadioGroup({ label, value, options, onValueChange, className = "" }: { label: string; value: string; options: ReadonlyArray<ChoiceOption>; onValueChange: (value: string) => void; className?: string }) {
  return <RACRadioGroup aria-label={label} value={value} onChange={onValueChange} className={`rac-radio-group ${className}`.trim()}>{options.map((option) => <Radio key={option.value} value={option.value} className="rac-radio"><span className="rac-radio-indicator" aria-hidden="true" />{option.label}</Radio>)}</RACRadioGroup>;
}

export function SegmentedControl({ label, value, options, onValueChange, className = "" }: { label: string; value: string; options: ReadonlyArray<ChoiceOption>; onValueChange: (value: string) => void; className?: string }) {
  return <RadioGroup label={label} value={value} options={options} onValueChange={onValueChange} className={`segmented-control ${className}`.trim()} />;
}

export type TabsItem = { id: string; label: ReactNode; content: ReactNode; className?: string; data?: Record<string, string | undefined> };

export function Tabs({ label, selectedKey, defaultSelectedKey, items, onSelectionChange, className = "", listClassName = "", tabClassName = "", panelClassName = "", renderPanels = true, listRef, onKeyDown }: { label: string; selectedKey?: string; defaultSelectedKey?: string; items: ReadonlyArray<TabsItem>; onSelectionChange?: (key: string) => void; className?: string; listClassName?: string; tabClassName?: string; panelClassName?: string; renderPanels?: boolean; listRef?: RefObject<HTMLDivElement | null>; onKeyDown?: KeyboardEventHandler }) {
  return <div onKeyDown={onKeyDown}><RACTabs selectedKey={selectedKey} defaultSelectedKey={defaultSelectedKey} onSelectionChange={(key) => onSelectionChange?.(String(key))} className={className}><TabList aria-label={label} items={items} className={listClassName} ref={listRef}>{(item) => <Tab id={item.id} className={`${tabClassName} ${item.className ?? ""}`.trim()} {...item.data} aria-controls={item.data?.["aria-controls"]}>{item.label}</Tab>}</TabList>{renderPanels && <TabPanels items={items}>{(item) => <TabPanel id={item.id} className={panelClassName}>{item.content}</TabPanel>}</TabPanels>}</RACTabs></div>;
}

export function Disclosure({ label, children, expanded, onExpandedChange, className = "" }: { label: ReactNode; children: ReactNode; expanded?: boolean; onExpandedChange?: (expanded: boolean) => void; className?: string }) {
  return <RACDisclosure isExpanded={expanded} onExpandedChange={onExpandedChange} className={className}><RACToggleButton slot="trigger" className="disclosure-trigger">{label}</RACToggleButton><DisclosurePanel className="disclosure-panel">{children}</DisclosurePanel></RACDisclosure>;
}

export type CommandListItem = { id: string; label: ReactNode; textValue: string; className?: string; data?: Record<string, string | undefined> };

/** CommandList 统一命令搜索结果的 listbox/option、键盘游标和 action 语义。 */
export function CommandList({ label, items, selectedKey, onSelectionChange, onAction, emptyState, className = "" }: { label: string; items: ReadonlyArray<CommandListItem>; selectedKey?: string; onSelectionChange?: (key: string) => void; onAction: (key: string) => void; emptyState?: ReactNode; className?: string }) {
  return <ListBox aria-label={label} items={items} selectionMode="single" selectedKeys={selectedKey ? [selectedKey] : []} onSelectionChange={(keys) => { const key = [...keys][0]; if (key !== undefined) onSelectionChange?.(String(key)); }} onAction={(key) => onAction(String(key))} renderEmptyState={() => emptyState} className={className}>{(item) => <ListBoxItem id={item.id} textValue={item.textValue} className={item.className} {...item.data}>{item.label}</ListBoxItem>}</ListBox>;
}

export function Avatar({ fallback, size = "sm", className = "" }: { fallback: ReactNode; size?: "sm" | "md" | "lg"; className?: string }) {
  return <HeroAvatar size={size} className={className}><HeroAvatar.Fallback>{fallback}</HeroAvatar.Fallback></HeroAvatar>;
}

export function Tooltip({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return <TooltipTrigger>{children}<RACTooltip className={`rac-tooltip ${className}`.trim()}>{label}</RACTooltip></TooltipTrigger>;
}

export type ActionMenuItem = { id: string; label: ReactNode; disabled?: boolean; data?: Record<string, string | undefined> };

export function ActionMenu({ label, trigger, items, onAction, triggerClassName = "", placement = "bottom start", isOpen, onOpenChange, menuClassName = "", triggerData }: { label: string; trigger: ReactNode; items: ReadonlyArray<ActionMenuItem>; onAction: (id: string) => void; triggerClassName?: string; placement?: "bottom start" | "bottom end"; isOpen?: boolean; onOpenChange?: (open: boolean) => void; menuClassName?: string; triggerData?: Record<string, string | undefined> }) {
  return <MenuTrigger isOpen={isOpen} onOpenChange={onOpenChange}><RACButton className={triggerClassName} aria-label={label} {...triggerData}>{trigger}</RACButton><Popover className="rac-menu-popover" placement={placement}><Menu aria-label={label} items={items} onAction={(key) => onAction(String(key))} className={`rac-menu ${menuClassName}`.trim()}>{(item) => <MenuItem id={item.id} isDisabled={item.disabled} className="rac-menu-item" {...item.data}>{item.label}</MenuItem>}</Menu></Popover></MenuTrigger>;
}
