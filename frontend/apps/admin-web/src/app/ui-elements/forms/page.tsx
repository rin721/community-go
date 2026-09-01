import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { FormElementsPage } from '../../../page-components/ui-elements/form-elements-page';

export default function FormElementsRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="form" label="正在加载表单组件" />}>
      <FormElementsPage />
    </Suspense>
  );
}
