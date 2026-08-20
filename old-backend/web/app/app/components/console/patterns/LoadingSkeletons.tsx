import { Skeleton, SkeletonText } from "~/components/console/primitives/Skeleton";
import { cn } from "~/lib/cn";

type StatGridSkeletonProps = {
  count?: number;
};

export function StatGridSkeleton({ count = 5 }: StatGridSkeletonProps) {
  return (
    <div className="console-admin-stat-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article className="console-admin-stat-card console-admin-stat-card--loading" key={index}>
          <Skeleton className="console-skeleton--icon" />
          <div>
            <Skeleton className="console-skeleton--label" />
            <Skeleton className="console-skeleton--value" />
          </div>
        </article>
      ))}
    </div>
  );
}

type TableSkeletonProps = {
  caption?: string;
  columns?: number;
  rows?: number;
};

export function TableSkeleton({ caption, columns = 4, rows = 6 }: TableSkeletonProps) {
  return (
    <div className="console-data-table-wrap" aria-label={caption}>
      <table className="console-data-table console-data-table--loading" aria-busy="true">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} scope="col">
                <Skeleton className="console-skeleton--table-heading" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <td key={columnIndex}>
                  <Skeleton
                    className={cn(
                      "console-skeleton--table-cell",
                      columnIndex === 0 && "console-skeleton--table-cell-wide",
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type PanelSkeletonProps = {
  rows?: number;
};

export function PanelSkeleton({ rows = 4 }: PanelSkeletonProps) {
  return (
    <div className="console-panel-skeleton" aria-hidden="true">
      <Skeleton className="console-skeleton--panel-title" />
      <SkeletonText lines={rows} />
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="console-form-skeleton" aria-hidden="true">
      {Array.from({ length: fields }).map((_, index) => (
        <div className="console-form-skeleton__field" key={index}>
          <Skeleton className="console-skeleton--label" />
          <Skeleton className="console-skeleton--input" />
        </div>
      ))}
    </div>
  );
}
