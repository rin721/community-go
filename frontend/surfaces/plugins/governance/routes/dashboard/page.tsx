'use client';

import { Page, PageHeader, Section } from '@community-go/surface-foundation/layout';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { useDevelopmentGovernance } from '@community-go/plugin-framework/governance-channel';
import { useFrontendTranslation } from '@community-go/i18n';

import type { ResolvedGovernanceAuthority } from '@community-go/schemas/governance';

/**
 * Governance Dashboard —— 最小 Control Plane UI。
 *
 * 经 Development Governance Channel 消费 Resolved Governance Model：
 * - 展示 Authority / Domain / Node 及其 Mutability / Scope / Capabilities / Evidence；
 * - 受控 validate / diagnose 展示（结构/语义级诊断，均由 Schema Layer 与
 *   Governance Composition 产出；本 Plugin 不拥有治理事实）。
 *
 * 删除本 Plugin 只失去可视化治理入口；真实 Authority 独立工作。
 */
export default function GovernanceDashboardPage() {
  const { t } = useFrontendTranslation();
  const channel = useDevelopmentGovernance();
  const inspection = channel.inspect();
  const model = inspection.value;

  const nodeCount = model.authorities.reduce(
    (total, authority) =>
      total + authority.domains.reduce((sum, domain) => sum + domain.nodes.length, 0),
    0,
  );
  const domainCount = model.authorities.reduce(
    (total, authority) => total + authority.domains.length,
    0,
  );

  return (
    <Page>
      <PageHeader
        description={t('governance.description')}
        eyebrow={t('governance.eyebrow')}
        title={t('governance.title')}
        actions={
          inspection.diagnostics.hasErrors ? undefined : (
            <StatusPill tone="success">{t('governance.healthy')}</StatusPill>
          )
        }
      />
      <Section
        title={`${t('governance.authorityCount')}: ${model.authorities.length} · ${t('governance.domainCount')}: ${domainCount} · ${t('governance.nodeCount')}: ${nodeCount}`}
        description={t('governance.diagnostics')}
      >
        <div className="grid gap-4 p-5">
          {inspection.diagnostics.errors.length === 0 &&
          inspection.diagnostics.warnings.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('governance.noDiagnostics')}</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {[...inspection.diagnostics.errors, ...inspection.diagnostics.warnings].map(
                (diagnostic, index) => (
                  <li
                    className="rounded-panel border border-border bg-surface-muted px-3 py-2"
                    key={index}
                  >
                    [{diagnostic.code}] {diagnostic.message}
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </Section>
      {model.authorities.map((authority) => (
        <AuthoritySection authority={authority} key={authority.authorityId} />
      ))}
    </Page>
  );
}

function AuthoritySection({ authority }: Readonly<{ authority: ResolvedGovernanceAuthority }>) {
  const { t } = useFrontendTranslation();
  return (
    <Section
      description={authority.description ?? authority.authorityReference}
      title={`${authority.title ?? authority.authorityId} · ${authority.authorityId}`}
    >
      <div className="grid gap-4 p-5">
        {authority.domains.map((domain) => (
          <div className="rounded-panel border border-border bg-surface p-4" key={domain.domainId}>
            <h3 className="text-sm font-semibold text-ink">{domain.title}</h3>
            {domain.description ? (
              <p className="mt-1 text-sm text-ink-muted">{domain.description}</p>
            ) : null}
            {domain.nodes.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">—</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {domain.nodes.map((node) => (
                  <li className="border-t border-border pt-3" key={node.nodeId}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink">{node.title}</span>
                      <span className="font-mono text-xs text-ink-muted">{node.nodeId}</span>
                    </div>
                    {node.description ? (
                      <p className="mt-1 text-sm text-ink-muted">{node.description}</p>
                    ) : null}
                    <dl className="mt-2 grid gap-1 text-xs text-ink-muted">
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-ink">{t('governance.mutability')}:</dt>
                        <dd>{node.mutability}</dd>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-ink">{t('governance.scope')}:</dt>
                        <dd>{node.scope}</dd>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-ink">{t('governance.capabilities')}:</dt>
                        <dd className="font-mono">{node.capabilities.join(', ')}</dd>
                      </div>
                      {node.source ? (
                        <div className="flex flex-wrap gap-1">
                          <dt className="font-medium text-ink">{t('governance.source')}:</dt>
                          <dd className="font-mono">{node.source}</dd>
                        </div>
                      ) : null}
                      {node.evidence.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          <dt className="font-medium text-ink">{t('governance.evidence')}:</dt>
                          <dd className="font-mono">{node.evidence.join(', ')}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
