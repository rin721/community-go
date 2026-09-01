import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { OverlayElementsPage } from '../../../page-components/ui-elements/overlay-elements-page';

export default function OverlayElementsRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="正在加载浮层组件" />}>
      <OverlayElementsPage />
    </Suspense>
  );
}
