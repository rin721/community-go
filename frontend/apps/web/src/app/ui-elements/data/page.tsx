import { Suspense } from 'react';

import { PageTransition } from '../../../host/page-transition';
import { DataElementsPage } from '../../../page-components/ui-elements/data-elements-page';

export default function DataElementsRoute() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <DataElementsPage />
      </Suspense>
    </PageTransition>
  );
}
