import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { DataElementsPage } from '../../../page-components/ui-elements/data-elements-page';

export default function DataElementsRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="正在加载数据组件" />}>
      <DataElementsPage />
    </Suspense>
  );
}
