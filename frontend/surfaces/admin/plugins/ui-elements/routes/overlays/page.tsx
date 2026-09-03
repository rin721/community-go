import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { OverlayElementsPage } from '../../src/overlay-elements-page';

export default function OverlayElementsRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="姝ｅ湪鍔犺浇娴眰缁勪欢" />}>
      <OverlayElementsPage />
    </Suspense>
  );
}
