import { BusyIndicator, Card, CardContent, Skeleton } from '@community-go/ui-adapter';

export function AppLoadingSurface({ label }: Readonly<{ label: string }>) {
  return (
    <main
      aria-busy="true"
      aria-label={label}
      className="grid min-h-screen place-items-center bg-canvas p-6 text-ink"
    >
      <Card aria-label={label} role="status">
        <CardContent>
          <div className="w-full min-w-72 max-w-sm space-y-4">
            <BusyIndicator label={label} showLabel />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
