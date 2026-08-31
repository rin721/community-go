import { Suspense } from 'react';

import { PageTransition } from '../../../layouts/page-transition';
import { FeedbackPage } from '../../../page-components/ui-elements/feedback-page';

export default function FeedbackRoute() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <FeedbackPage />
      </Suspense>
    </PageTransition>
  );
}
