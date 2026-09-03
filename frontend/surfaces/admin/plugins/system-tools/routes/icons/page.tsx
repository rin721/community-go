'use client';

import { AdminPage, AdminPageHeader } from '@community-go/admin-foundation/layout';
import { adminNavigationIconVocabulary } from '@community-go/admin-surface/shell';
import { AdminNavigationIcon } from '@community-go/admin-surface/icon-presentation';
import { useFrontendTranslation } from '@community-go/i18n';
import { Panel } from '@community-go/ui-adapter/panel';

/**
 * Icon 大全 —— 遍历 Admin Surface 受控语义 icon vocabulary 并渲染 glyph。
 *
 * Plugin 侧不直接 import lucide：iconId → Icon Component 的唯一映射在 Surface
 * 基础设施层（@community-go/admin-surface/icon-presentation），本页只消费
 * semantic iconId + AdminNavigationIcon，避免把图标库依赖泄漏进 Plugin。
 */
export default function SystemToolsIconsPage() {
  const { t } = useFrontendTranslation();

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('systemTools.icons.title')}
        description={t('systemTools.icons.description')}
      />
      <Panel aria-label={t('systemTools.icons.title')} className="p-6">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {adminNavigationIconVocabulary.map((iconId) => (
            <li
              className="flex min-w-0 items-center gap-3 rounded-panel border border-border bg-surface-muted px-4 py-3"
              key={iconId}
            >
              <AdminNavigationIcon className="size-4 shrink-0 text-ink-muted" iconId={iconId} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {iconId}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </AdminPage>
  );
}
