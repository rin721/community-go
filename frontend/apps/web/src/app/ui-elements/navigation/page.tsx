import { Suspense } from 'react';

import { PageTransition } from '../../../host/page-transition';
import { NavigationElementsPage } from '../../../page-components/ui-elements/navigation-elements-page';

export default function NavigationElementsRoute() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <NavigationElementsPage />
      </Suspense>
    </PageTransition>
  );
}
