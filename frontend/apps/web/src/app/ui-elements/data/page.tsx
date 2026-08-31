import { Suspense } from 'react';

import { DataElementsPage } from '../../../page-components/ui-elements/data-elements-page';

export default function DataElementsRoute() {
  return (
    <Suspense fallback={null}>
      <DataElementsPage />
    </Suspense>
  );
}
