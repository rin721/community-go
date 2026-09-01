import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { IdentityDisplayPage } from '../../../page-components/ui-elements/identity-display-page';

export default function IdentityDisplayRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="正在加载身份组件" />}>
      <IdentityDisplayPage />
    </Suspense>
  );
}
