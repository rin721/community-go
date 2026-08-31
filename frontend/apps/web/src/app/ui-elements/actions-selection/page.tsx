import { Suspense } from 'react';

import { ActionsSelectionPage } from '../../../page-components/ui-elements/actions-selection-page';

export default function ActionsSelectionRoute() {
  return (
    <Suspense fallback={null}>
      <ActionsSelectionPage />
    </Suspense>
  );
}
