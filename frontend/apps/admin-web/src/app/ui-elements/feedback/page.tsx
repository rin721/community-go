import { Suspense } from 'react';
import { AdminPageLoadingSurface } from '@community-go/admin-foundation/states-operations';

import { FeedbackPage } from '../../../page-components/ui-elements/feedback-page';

export default function FeedbackRoute() {
  return (
    <Suspense fallback={<AdminPageLoadingSurface kind="catalog" label="正在加载反馈组件" />}>
      <FeedbackPage />
    </Suspense>
  );
}
