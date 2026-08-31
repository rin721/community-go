import { Suspense } from 'react';

import { SurfacesPage } from '../../../page-components/ui-elements/surfaces-page';

export default function SurfacesRoute() {
  return (
    <Suspense fallback={null}>
      <SurfacesPage />
    </Suspense>
  );
}
