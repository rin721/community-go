import { Suspense } from 'react';

import { PageTransition } from '../../../host/page-transition';
import { StatusAsyncPage } from '../../../page-components/ui-elements/status-async-page';

export default function StatusAsyncRoute() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <StatusAsyncPage />
      </Suspense>
    </PageTransition>
  );
}
