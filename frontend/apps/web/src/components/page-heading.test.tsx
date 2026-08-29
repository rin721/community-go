import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { PageHeading } from './page-heading';

describe('PageHeading', () => {
  it('以可访问标题组织页面信息', () => {
    render(
      <PageHeading
        eyebrow="Architecture map"
        title="稳定能力向下沉"
        description="依赖只能朝向稳定契约。"
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: '稳定能力向下沉' })).toBeVisible();
    expect(screen.getByText('依赖只能朝向稳定契约。')).toBeVisible();
  });

  it('基础标题区域没有可检测的 Accessibility 违规', async () => {
    render(
      <PageHeading
        eyebrow="Architecture map"
        title="稳定能力向下沉"
        description="依赖只能朝向稳定契约。"
      />,
    );

    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
