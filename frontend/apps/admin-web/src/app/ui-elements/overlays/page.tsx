import { Suspense } from 'react';

import { PageTransition } from '../../../layouts/page-transition';
import { OverlayElementsPage } from '../../../page-components/ui-elements/overlay-elements-page';

export default function OverlayElementsRoute() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <OverlayElementsPage />
      </Suspense>
    </PageTransition>
  );
}
