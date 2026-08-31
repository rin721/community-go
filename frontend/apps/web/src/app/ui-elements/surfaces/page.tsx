import { Suspense } from 'react';

import { PageTransition } from '../../../host/page-transition';
import { SurfacesPage } from '../../../page-components/ui-elements/surfaces-page';

export default function SurfacesRoute() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <SurfacesPage />
      </Suspense>
    </PageTransition>
  );
}
