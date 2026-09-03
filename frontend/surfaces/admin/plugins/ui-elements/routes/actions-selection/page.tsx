import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { ActionsSelectionPage } from '../../src/actions-selection-page';

export default function ActionsSelectionRoute() {
  return (
    <Suspense
      fallback={<AdminPageLoadingSurface kind="catalog" label="姝ｅ湪鍔犺浇鎿嶄綔缁勪欢" />}
    >
      <ActionsSelectionPage />
    </Suspense>
  );
}
