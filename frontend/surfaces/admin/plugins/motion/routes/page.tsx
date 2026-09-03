'use client';

import { AdminPage, AdminPageHeader, AdminSection } from '@community-go/admin-foundation/layout';
import { LiveRegion } from '@community-go/ui-adapter/accessibility';
import { AsyncRegion, type AsyncRegionPhase } from '@community-go/ui-adapter/async-region';
import { BusyIndicator } from '@community-go/ui-adapter/busy-indicator';
import { DisclosurePanel } from '@community-go/ui-adapter/disclosure';
import { Skeleton } from '@community-go/ui-adapter/skeleton';
import { StateSurface } from '@community-go/ui-adapter/state-surface';
import { ToggleGroup } from '@community-go/ui-adapter/toggle-group';
import { CircleAlert, Inbox } from 'lucide-react';
import { useState } from 'react';

import { MotionInspector } from '../src/motion-inspector';
import { ViewportReveal } from '@community-go/admin-foundation/viewport-reveal';

const asyncPhases: readonly AsyncRegionPhase[] = [
  'initial',
  'ready',
  'refreshing',
  'background',
  'empty',
  'error',
];

export default function MotionPage() {
  const [phase, setPhase] = useState<AsyncRegionPhase>('initial');
  return (
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
          <ToggleGroup
            label="Async phase"
            options={asyncPhases.map((item) => ({ id: item, label: item }))}
            selectedIds={[phase]}
            selectionMode="single"
            onSelectionChange={(selected) => {
              const next = selected[0] as AsyncRegionPhase | undefined;
              if (next) setPhase(next);
            }}
          />
          <LiveRegion>当前异步阶段：{phase}</LiveRegion>
          <AsyncRegion
            label="Motion content swap"
            phase={phase}
            loading={
              <div className="grid gap-3" aria-label="Loading motion scenario">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            }
            refreshing={
              <div className="mb-3 flex items-center gap-2 text-sm text-ink-muted">
                <BusyIndicator label="正在刷新内容" />
                <span>保留旧内容并刷新</span>
              </div>
            }
            empty={
              <StateSurface
                compact
                description="当前条件没有结果。"
                icon={<Inbox className="size-5" />}
                state="empty"
                title="暂无内容"
              />
            }
            error={
              <StateSurface
                compact
                description="该 Region 可以独立恢复。"
                icon={<CircleAlert className="size-5" />}
                state="error"
                title="内容加载失败"
              />
            }
          >
            <div className="rounded-panel bg-success-soft p-5 text-sm text-success">
              内容已经就绪；快速切换不会留下退出层。
            </div>
          </AsyncRegion>
        </div>
      </AdminSection>
      <AdminSection
        title="Developer Motion Inspector"
        description="开发期统一覆盖系统策略、Recipe 分类和慢速倍率；production 不渲染。"
      >
        <div className="p-5">
          <MotionInspector />
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
      <ViewportReveal>
        <AdminSection
          title="Viewport Reveal"
          description="该 below-fold Region 只在首次进入视口时 reveal，离开后不重播。"
        >
          <div className="p-5 text-sm leading-6 text-ink-muted">
            Observer 生命周期由 Web Host 单例管理；Recipe 与 Reduced Motion Policy 仍由 Foundation
            管理。
          </div>
        </AdminSection>
      </ViewportReveal>
    </AdminPage>
  );
}
