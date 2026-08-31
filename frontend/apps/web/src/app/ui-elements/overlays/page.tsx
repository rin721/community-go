import { Suspense } from 'react';

import { OverlayElementsPage } from '../../../page-components/ui-elements/overlay-elements-page';

export default function OverlayElementsRoute() {
  return (
    <Suspense fallback={null}>
      <OverlayElementsPage />
    </Suspense>
  );
}
