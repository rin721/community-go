import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { NavigationElementsPage } from '../../../page-components/ui-elements/navigation-elements-page';

export default function NavigationElementsRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="正在加载导航组件" />}>
      <NavigationElementsPage />
    </Suspense>
  );
}
