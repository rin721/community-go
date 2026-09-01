import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { SurfacesPage } from '../../../page-components/ui-elements/surfaces-page';

export default function SurfacesRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="正在加载表面组件" />}>
      <SurfacesPage />
    </Suspense>
  );
}
