'use client';

import { AdminCollection } from '@community-go/admin-foundation/collection';
import {
  AdminEntitySummary,
  AdminSettingsLayout,
  AdminTimeline,
} from '@community-go/admin-foundation/detail-settings';
import { AdminFormActions, AdminFormStatus } from '@community-go/admin-foundation/form-actions';
import {
  AdminPage,
  AdminPageHeader,
  AdminSection,
  AdminSplitView,
} from '@community-go/admin-foundation/layout';
import { AdminOperationStatus } from '@community-go/admin-foundation/states-operations';
import { useFrontendTranslation } from '@community-go/i18n';
import { Action } from '@community-go/ui-adapter/action';
import { Panel } from '@community-go/ui-adapter/panel';
import { TextLink } from '@community-go/ui-adapter/navigation';
import { StateSurface } from '@community-go/ui-adapter/state-surface';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { Clock3, FileText } from 'lucide-react';

export type AdminArchetype = 'overview' | 'detail' | 'settings' | 'master-detail' | 'operation';

const labels = {
  'zh-CN': {
    overview: ['总览页面', '指标、异常与下一步行动拥有稳定的信息层级。'],
    detail: ['实体详情', '摘要、元数据、时间线与状态操作保持职责分离。'],
    settings: ['设置页面', '导航、只读分区、可编辑分区与保存动作拥有固定位置。'],
    'master-detail': ['主从页面', '桌面双栏在窄屏退化为单列，详情仍保持上下文。'],
    operation: ['操作任务', '排队、处理中、成功与失败使用不同于页面 Loading 的语义。'],
  },
  en: {
    overview: ['Overview page', 'Metrics, exceptions, and next actions keep a stable hierarchy.'],
    detail: ['Entity detail', 'Summary, metadata, timeline, and actions stay independently owned.'],
    settings: [
      'Settings page',
      'Navigation, read-only sections, editable sections, and save actions remain predictable.',
    ],
    'master-detail': [
      'Master-detail page',
      'The desktop split degrades to one column without losing context.',
    ],
    operation: [
      'Operation page',
      'Queued, running, successful, and failed work is distinct from page loading.',
    ],
  },
} as const;

function OverviewScenario() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[
        ['128', 'Active resources'],
        ['7', 'Need review'],
        ['99.9%', 'Policy coverage'],
      ].map(([value, label]) => (
        <Panel className="p-5" key={label}>
          <p className="text-sm text-ink-muted">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{value}</p>
        </Panel>
      ))}
      <AdminSection
        appearance="outlined"
        description="The warning remains actionable without replacing healthy content."
        title="Attention required"
      >
        <StateSurface
          compact
          actionLabel="Review"
          description="Two deterministic items are awaiting a decision."
          icon={<Clock3 className="size-5" />}
          onAction={() => undefined}
          state="warning"
          title="Review queue"
        />
      </AdminSection>
    </div>
  );
}

function DetailScenario() {
  return (
    <div className="space-y-5">
      <AdminEntitySummary
        actions={<Action onPress={() => undefined}>Edit</Action>}
        description="REF-028 · deterministic semantic scenario"
        status={<StatusPill tone="success">Healthy</StatusPill>}
        title="Regional release readiness"
      />
      <AdminSection title="Activity">
        <div className="p-5">
          <AdminTimeline
            label="Entity activity"
            items={[
              { id: 'approved', title: 'Approved', meta: '10:40', tone: 'success' },
              { id: 'reviewed', title: 'Policy reviewed', meta: '09:15' },
            ]}
          />
        </div>
      </AdminSection>
    </div>
  );
}

function SettingsScenario() {
  return (
    <AdminSettingsLayout
      navigation={
        <Panel className="p-3">
          <nav aria-label="Settings sections" className="grid gap-1">
            <TextLink href="#general">General</TextLink>
            <TextLink href="#notifications" tone="neutral">
              Notifications
            </TextLink>
          </nav>
        </Panel>
      }
    >
      <AdminSection id="general" title="General settings">
        <div className="p-5 text-sm leading-6 text-ink-muted">
          Editable fields belong to the Feature schema.
        </div>
      </AdminSection>
      <AdminFormActions
        primary={<Action onPress={() => undefined}>Save changes</Action>}
        secondary={
          <Action variant="quiet" onPress={() => undefined}>
            Reset
          </Action>
        }
        summary={
          <AdminFormStatus
            lifecycle="dirty"
            labels={{
              pristine: 'Saved',
              dirty: 'Unsaved',
              submitting: 'Saving',
              submitted: 'Saved',
              invalid: 'Fix errors',
            }}
          />
        }
      />
    </AdminSettingsLayout>
  );
}

function MasterDetailScenario() {
  return (
    <AdminSplitView
      master={
        <AdminCollection
          content={
            <div className="grid gap-1 p-2">
              {['Policy review', 'Release readiness', 'Audit queue'].map((item) => (
                <Action fullWidth key={item} variant="quiet" onPress={() => undefined}>
                  {item}
                </Action>
              ))}
            </div>
          }
          title="Resources"
        />
      }
      detail={
        <AdminEntitySummary
          description="Selected from the master collection"
          title="Policy review"
        />
      }
    />
  );
}

function OperationScenario() {
  return (
    <AdminOperationStatus
      actions={
        <Action variant="secondary" onPress={() => undefined}>
          Cancel
        </Action>
      }
      description="This local state proves pending-operation semantics without a backend task."
      icon={<FileText className="size-5" />}
      progress={62}
      progressLabel="Operation progress"
      state="running"
      title="Generating report"
    />
  );
}

export function AdminReferenceArchetype({ kind }: Readonly<{ kind: AdminArchetype }>) {
  const { locale } = useFrontendTranslation();
  const [title, description] = labels[locale === 'en' ? 'en' : 'zh-CN'][kind];
  const scenario =
    kind === 'overview' ? (
      <OverviewScenario />
    ) : kind === 'detail' ? (
      <DetailScenario />
    ) : kind === 'settings' ? (
      <SettingsScenario />
    ) : kind === 'master-detail' ? (
      <MasterDetailScenario />
    ) : (
      <OperationScenario />
    );

  return (
    <AdminPage>
      <AdminPageHeader
        actions={<StatusPill tone="info">Reference Scenario</StatusPill>}
        description={description}
        eyebrow="Admin Page Archetype"
        title={title}
      />
      {scenario}
    </AdminPage>
  );
}
