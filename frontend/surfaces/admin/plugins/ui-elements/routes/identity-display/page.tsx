import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { IdentityDisplayPage } from '../../src/identity-display-page';

export default function IdentityDisplayRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="姝ｅ湪鍔犺浇韬唤缁勪欢" />}>
      <IdentityDisplayPage />
    </Suspense>
  );
}
