// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDevelopmentGovernance } from '@community-go/plugin-framework/governance-channel';

import { HostGovernanceChannelProvider } from '../host/governance-channel';

const surfaceNodeTarget = {
  authorityId: 'design-system',
  domainId: 'visual-language',
  nodeId: 'visual-language.semantic-color',
};

function GovernanceProbe() {
  const channel = useDevelopmentGovernance();
  const model = channel.inspect().value;
  const diagnosed = channel.diagnose(surfaceNodeTarget);
  return (
    <>
      <span data-testid="authority-count">{model.authorities.length}</span>
      <span data-testid="diagnosed-node">
        {diagnosed.value?.nodeId ?? 'denied'}:{diagnosed.diagnostics.hasErrors ? 'error' : 'ok'}
      </span>
    </>
  );
}

function BoundaryProbe() {
  const channel = useDevelopmentGovernance();
  const read = channel.read({
    authorityId: 'ui-adapter',
    domainId: 'heroui-isolation',
    nodeId: 'heroui-isolation.vendor-boundary',
  });
  const denied = read.diagnostics.warnings.some(
    (item) => item.code === 'GOV_UNSUPPORTED_OPERATION',
  );
  return <span data-testid="boundary-denied">{denied ? 'denied' : 'allowed'}</span>;
}

function DevOverrideProbe() {
  const channel = useDevelopmentGovernance();
  const result = channel.devOverride(
    {
      authorityId: 'design-system',
      domainId: 'visual-language',
      nodeId: 'visual-language.radius-border', // fixed 只读，无 dev-override
    },
    { radius: '1rem' },
  );
  const denied = result.diagnostics.warnings.some(
    (item) => item.code === 'GOV_UNSUPPORTED_OPERATION',
  );
  return <span data-testid="override-denied">{denied ? 'denied' : 'allowed'}</span>;
}

describe('host development governance channel', () => {
  it('安装后消费 Resolved Governance Model（五个 Authority）', () => {
    render(
      <HostGovernanceChannelProvider>
        <GovernanceProbe />
      </HostGovernanceChannelProvider>,
    );
    expect(screen.getByTestId('authority-count').textContent).toBe('5');
    expect(screen.getByTestId('diagnosed-node').textContent).toBe(
      'visual-language.semantic-color:ok',
    );
  });

  it('boundary 节点 diagnose 可用但 read 被能力门禁拒绝', () => {
    render(
      <HostGovernanceChannelProvider>
        <BoundaryProbe />
      </HostGovernanceChannelProvider>,
    );
    expect(screen.getByTestId('boundary-denied').textContent).toBe('denied');
  });

  it('devOverride 对未声明 dev-override 的节点返回 GOV_UNSUPPORTED_OPERATION', () => {
    render(
      <HostGovernanceChannelProvider>
        <DevOverrideProbe />
      </HostGovernanceChannelProvider>,
    );
    expect(screen.getByTestId('override-denied').textContent).toBe('denied');
  });
});
