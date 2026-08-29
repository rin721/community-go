export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-control bg-surface-muted ${className}`}
      aria-hidden="true"
    />
  );
}
