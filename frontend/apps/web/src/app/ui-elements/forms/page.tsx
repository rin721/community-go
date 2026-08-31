import { Suspense } from 'react';

import { PageTransition } from '../../../host/page-transition';
import { FormElementsPage } from '../../../page-components/ui-elements/form-elements-page';

export default function FormElementsRoute() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <FormElementsPage />
      </Suspense>
    </PageTransition>
  );
}
