import { Suspense } from 'react';

import { NavigationElementsPage } from '../../../page-components/ui-elements/navigation-elements-page';

export default function NavigationElementsRoute() {
  return (
    <Suspense fallback={null}>
      <NavigationElementsPage />
    </Suspense>
  );
}
