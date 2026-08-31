import { Suspense } from 'react';

import { FeedbackPage } from '../../../page-components/ui-elements/feedback-page';

export default function FeedbackRoute() {
  return (
    <Suspense fallback={null}>
      <FeedbackPage />
    </Suspense>
  );
}
