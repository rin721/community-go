import { Calendar, DateField, DatePicker, Description, Label } from '@heroui/react';

export type DatePickerFieldProps = Readonly<{
  label: string;
  hint?: string;
  calendarLabel: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  onValueChange?: (value: string | null) => void;
}>;

export function DatePickerField({
  label,
  hint,
  calendarLabel,
  disabled = false,
  defaultOpen = false,
  onValueChange,
}: DatePickerFieldProps) {
  return (
    <DatePicker
      className="grid w-full gap-2 text-sm"
      defaultOpen={defaultOpen}
      isDisabled={disabled}
      onChange={(value) => onValueChange?.(value?.toString() ?? null)}
    >
      <Label className="font-semibold text-ink">{label}</Label>
      <DateField.Group className="flex min-h-11 items-center rounded-control border border-border bg-surface px-3.5 text-sm text-ink shadow-sm data-[focus-within]:border-brand">
        <DateField.Input className="min-w-0 flex-1">
          {(segment) => (
            <DateField.Segment
              className="rounded px-0.5 outline-none data-[focused]:bg-brand-soft data-[focused]:text-brand"
              segment={segment}
            />
          )}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger className="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-surface-muted">
            <DatePicker.TriggerIndicator className="size-4" />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      {hint ? <Description className="text-xs leading-5 text-ink-muted">{hint}</Description> : null}
      <DatePicker.Popover className="rounded-panel border border-border bg-surface-raised p-3 text-ink shadow-overlay">
        <Calendar aria-label={calendarLabel}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
