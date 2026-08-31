import { Suspense } from 'react';

import { FormElementsPage } from '../../../page-components/ui-elements/form-elements-page';

export default function FormElementsRoute() {
  return (
    <Suspense fallback={null}>
      <FormElementsPage />
    </Suspense>
  );
}
