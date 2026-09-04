'use client';

import { GovernanceChannelProvider } from '@community-go/plugin-framework/governance-channel';
import { createGovernanceApi } from '@community-go/schemas/governance';
import type { ReactNode } from 'react';

import { resolvedGovernanceModel } from '../governance/generated-model';

/**
 * Host Development Governance Channel —— 唯一 Governance API 实现注入点。
 *
 * - 内部用 Schema Layer 的 createGovernanceApi(resolvedGovernanceModel, env)
 *   构造统一 Governance API（能力门禁在 schemas 层执行，Host 不复制规则）；
 * - devOverride 仅开发环境可用（NODE_ENV !== 'production'），写 sessionStorage
 *   （dev-only 状态，参照 motion-policy inspector 先例）；production 返回
 *   GOV_DEV_OVERRIDE_UNAVAILABLE（schemas 门禁），不读写任何存储；
 * - Channel 不暴露 Host store/router/i18n 等私有能力；只服务 Governance
 *   Control Plane（治理类 Plugin 消费）。
 */

const devOverrideSessionKey = 'community-go.governance-override';
const devOverrideAvailable = process.env.NODE_ENV !== 'production';

const governanceApi = createGovernanceApi(resolvedGovernanceModel, {
  devOverrideAvailable,
});

function recordDevOverride(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(devOverrideSessionKey);
    const store: Record<string, unknown> = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    store[key] = value;
    window.sessionStorage.setItem(devOverrideSessionKey, JSON.stringify(store));
  } catch {
    // sessionStorage 不可用时 dev override 只是开发辅助，保持原样（不吞业务错误：
    // dev override 失败不影响治理读取/诊断）。
  }
}

export function HostGovernanceChannelProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <GovernanceChannelProvider
      port={{
        inspect: () => governanceApi.inspect(),
        read: (target) => governanceApi.read(target),
        validate: (target) => governanceApi.validate(target),
        diagnose: (target) => governanceApi.diagnose(target),
        preview: (target, draft, currentValue) =>
          governanceApi.preview(target, draft, currentValue),
        diff: (target, draft, currentValue) => governanceApi.diff(target, draft, currentValue),
        devOverride: (target, value) => {
          const result = governanceApi.devOverride(target, value);
          if (!result.diagnostics.hasErrors) {
            recordDevOverride(`${target.authorityId}.${target.domainId}.${target.nodeId}`, value);
          }
          return result;
        },
      }}
    >
      {children}
    </GovernanceChannelProvider>
  );
}
