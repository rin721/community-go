import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { StatusAsyncPage } from '../../../page-components/ui-elements/status-async-page';

export default function StatusAsyncRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="正在加载异步状态组件" />}>
      <StatusAsyncPage />
    </Suspense>
  );
}
