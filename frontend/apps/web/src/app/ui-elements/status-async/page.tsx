import { Suspense } from 'react';

import { StatusAsyncPage } from '../../../page-components/ui-elements/status-async-page';

export default function StatusAsyncRoute() {
  return (
    <Suspense fallback={null}>
      <StatusAsyncPage />
    </Suspense>
  );
}
