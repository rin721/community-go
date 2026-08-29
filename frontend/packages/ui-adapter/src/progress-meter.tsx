export function ProgressMeter({ value, label }: { value: number; label: string }) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-xs font-medium text-ink-muted">
        <span>{label}</span>
        <span>{normalizedValue}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedValue}
      >
        <div
          className="h-full rounded-full bg-brand transition-all duration-300"
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}
