export type SkeletonProps = Readonly<{
  className?: string;
}>;

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <span
      className={`block animate-pulse rounded-control bg-surface-muted ${className}`}
      aria-hidden="true"
    />
  );
}
