'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AppLoadingSurface } from '../../host/app-loading-surface';
import { shouldProceedWithNavigation } from '../../host/navigation-lifecycle';

export default function UiElementsIndexPage() {
  const router = useRouter();
  useEffect(() => {
    // 首帧基线可能尚未建立；lastCommittedHref 为 null 时不短路（视为真实 replace）。
    if (!shouldProceedWithNavigation('/ui-elements/actions-selection')) return;
    void router.replace('/ui-elements/actions-selection');
  }, [router]);
  return <AppLoadingSurface label="UI Elements 正在加载" />;
}
