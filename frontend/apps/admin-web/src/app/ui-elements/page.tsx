'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AppLoadingSurface } from '../../host/app-loading-surface';
import { beginNavigation } from '../../host/navigation-progress';

export default function UiElementsIndexPage() {
  const router = useRouter();
  useEffect(() => {
    beginNavigation();
    void router.replace('/ui-elements/actions-selection');
  }, [router]);
  return <AppLoadingSurface label="UI Elements 正在加载" />;
}
