// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DevelopmentGovernancePort } from './governance-channel';
import { GovernanceChannelProvider, useDevelopmentGovernance } from './governance-channel';

const port: DevelopmentGovernancePort = {
  inspect: () => ({
    value: {
      authorities: [],
      diagnostics: { errors: [], warnings: [], hasErrors: false },
    },
    diagnostics: { errors: [], warnings: [], hasErrors: false },
  }),
  read: () => ({
    diagnostics: { errors: [], warnings: [], hasErrors: false },
  }),
  validate: () => ({
    diagnostics: { errors: [], warnings: [], hasErrors: false },
  }),
  diagnose: () => ({
    diagnostics: { errors: [], warnings: [], hasErrors: false },
  }),
  preview: () => ({
    diagnostics: { errors: [], warnings: [], hasErrors: false },
  }),
  diff: () => ({
    diagnostics: { errors: [], warnings: [], hasErrors: false },
  }),
  devOverride: () => ({
    diagnostics: { errors: [], warnings: [], hasErrors: false },
  }),
};

function GovernanceProbe() {
  const channel = useDevelopmentGovernance();
  const inspection = channel.inspect();
  return (
    <span data-testid="authority-count">
      {inspection.value.authorities.length}:{inspection.diagnostics.hasErrors ? 'error' : 'ok'}
    </span>
  );
}

describe('development governance channel', () => {
  it('Provider 安装后可消费 Governance Port', () => {
    render(
      <GovernanceChannelProvider port={port}>
        <GovernanceProbe />
      </GovernanceChannelProvider>,
    );
    expect(screen.getByTestId('authority-count').textContent).toBe('0:ok');
  });

  it('未安装 Provider 时 useDevelopmentGovernance throw（保持失败语义）', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<GovernanceProbe />)).toThrow(/GovernanceChannelProvider 未安装/);
    spy.mockRestore();
  });
});
