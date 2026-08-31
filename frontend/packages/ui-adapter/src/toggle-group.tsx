import { tv } from '@heroui/styles';
import { ToggleButton } from '@heroui/react/toggle-button';
import { ToggleButtonGroup as HeroToggleButtonGroup } from '@heroui/react/toggle-button-group';
import { useId, type ReactNode } from 'react';

export type ToggleGroupOption = Readonly<{
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}>;

export type ToggleGroupProps = Readonly<{
  label: string;
  description?: string;
  options: readonly ToggleGroupOption[];
  selectedIds: readonly string[];
  onSelectionChange: (selectedIds: readonly string[]) => void;
  selectionMode?: 'single' | 'multiple';
  size?: 'sm' | 'md';
  disabled?: boolean;
}>;

const toggleStyles = tv({
  base: 'rounded-control border border-transparent font-semibold text-ink-muted outline-none transition-colors hover:bg-surface data-[selected]:border-brand/25 data-[selected]:bg-brand-soft data-[selected]:text-brand',
  defaultVariants: { size: 'md' },
  variants: {
    size: {
      md: 'min-h-control gap-2 px-3.5 text-sm',
      sm: 'min-h-control-sm gap-1.5 px-3 text-sm',
    },
  },
});

export function ToggleGroup({
  label,
  description,
  options,
  selectedIds,
  onSelectionChange,
  selectionMode = 'single',
  size = 'md',
  disabled = false,
}: ToggleGroupProps) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-ink" id={labelId}>
        {label}
      </span>
      {description ? (
        <span className="text-xs leading-5 text-ink-muted" id={descriptionId}>
          {description}
        </span>
      ) : null}
      <HeroToggleButtonGroup
        aria-labelledby={labelId}
        className="inline-flex max-w-full rounded-panel border border-border bg-surface-muted p-1"
        isDisabled={disabled}
        onSelectionChange={(keys) => onSelectionChange([...keys].map(String))}
        selectedKeys={new Set(selectedIds)}
        selectionMode={selectionMode}
        {...(description ? { 'aria-describedby': descriptionId } : {})}
      >
        {options.map((option) => (
          <ToggleButton
            className={toggleStyles({ size })}
            id={option.id}
            key={option.id}
            variant="ghost"
            {...(option.disabled !== undefined ? { isDisabled: option.disabled } : {})}
          >
            {option.icon ? (
              <span aria-hidden="true" className="grid size-icon-sm place-items-center">
                {option.icon}
              </span>
            ) : null}
            <span>{option.label}</span>
          </ToggleButton>
        ))}
      </HeroToggleButtonGroup>
    </div>
  );
}
