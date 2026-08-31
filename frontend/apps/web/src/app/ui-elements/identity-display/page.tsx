import { Suspense } from 'react';

import { IdentityDisplayPage } from '../../../page-components/ui-elements/identity-display-page';

export default function IdentityDisplayRoute() {
  return (
    <Suspense fallback={null}>
      <IdentityDisplayPage />
    </Suspense>
  );
}
