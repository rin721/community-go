import { Suspense } from 'react';

import { PageTransition } from '../../../host/page-transition';
import { ActionsSelectionPage } from '../../../page-components/ui-elements/actions-selection-page';

export default function ActionsSelectionRoute() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <ActionsSelectionPage />
      </Suspense>
    </PageTransition>
  );
}
