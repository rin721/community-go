import { ProgressMeter, Skeleton } from '@community-go/ui-adapter';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Status Family', () => {
  it('ProgressMeter 将确定进度限制在 0 到 100', () => {
    const { rerender } = render(<ProgressMeter label="导入进度" value={140} />);

    const progress = screen.getByRole('progressbar', { name: '导入进度' });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100%')).toBeVisible();

    rerender(<ProgressMeter label="导入进度" value={Number.NaN} />);
    expect(progress).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeVisible();
  });

  it('Skeleton 只提供视觉占位，不进入辅助技术内容', () => {
    const { container } = render(<Skeleton className="h-8" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
