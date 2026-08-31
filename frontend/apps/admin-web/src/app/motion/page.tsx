'use client';

import { AdminPage, AdminPageHeader, AdminSection } from '@community-go/admin-foundation/layout';
import { Action } from '@community-go/ui-adapter/action';
import { LiveRegion } from '@community-go/ui-adapter/accessibility';
import { AsyncRegion } from '@community-go/ui-adapter/async-region';
import { DisclosurePanel } from '@community-go/ui-adapter/disclosure';
import { Skeleton } from '@community-go/ui-adapter/skeleton';
import { useState } from 'react';

import { PageTransition } from '../../layouts/page-transition';

export default function MotionPage() {
  const [ready, setReady] = useState(false);
  return (
    <PageTransition>
      <AdminPage>
        <AdminPageHeader
          description="只验证 Universal Presence、Content Swap、Disclosure 与 Reduced Motion Policy；Admin screen recipe 在 Surface 层单独消费。"
          eyebrow="Universal Motion Foundation"
          title="语义动效与中断安全"
        />
        <AdminSection
          title="Content Swap"
          description="Loading 与 Ready 由状态组件主持，不由万能动画容器猜测。"
        >
          <div className="grid gap-4 p-5">
            <Action variant="secondary" onPress={() => setReady((value) => !value)}>
              {ready ? '切换到 Loading' : '切换到 Ready'}
            </Action>
            <LiveRegion>{ready ? '内容已经就绪' : '内容正在加载'}</LiveRegion>
            <AsyncRegion
              label="Motion content swap"
              state={ready ? 'ready' : 'loading'}
              loading={
                <div className="grid gap-3" aria-label="Loading motion scenario">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              }
            >
              <div className="rounded-panel bg-success-soft p-5 text-sm text-success">
                内容已经就绪；快速切换不会留下退出层。
              </div>
            </AsyncRegion>
          </div>
        </AdminSection>
        <AdminSection
          title="Disclosure"
          description="展开/收起由可访问 Primitive 持有状态与键盘语义。"
        >
          <div className="p-5">
            <DisclosurePanel
              title="Motion policy"
              description="系统 reduced-motion 偏好会关闭非必要位移。"
            >
              Overlay 继续由 HeroUI 主持 Enter/Exit，页面不得再次包裹动画容器。
            </DisclosurePanel>
          </div>
        </AdminSection>
      </AdminPage>
    </PageTransition>
  );
}
