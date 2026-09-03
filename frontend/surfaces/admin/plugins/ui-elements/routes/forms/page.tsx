import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { FormElementsPage } from '../../src/form-elements-page';

export default function FormElementsRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="form" label="姝ｅ湪鍔犺浇琛ㄥ崟缁勪欢" />}>
      <FormElementsPage />
    </Suspense>
  );
}
