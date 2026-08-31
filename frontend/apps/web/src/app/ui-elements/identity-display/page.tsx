import { Suspense } from 'react';

import { PageTransition } from '../../../layouts/page-transition';
import { IdentityDisplayPage } from '../../../page-components/ui-elements/identity-display-page';

export default function IdentityDisplayRoute() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <IdentityDisplayPage />
      </Suspense>
    </PageTransition>
  );
}
