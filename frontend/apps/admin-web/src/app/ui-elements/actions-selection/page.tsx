import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { ActionsSelectionPage } from '../../../page-components/ui-elements/actions-selection-page';

export default function ActionsSelectionRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="正在加载操作组件" />}>
      <ActionsSelectionPage />
    </Suspense>
  );
}
