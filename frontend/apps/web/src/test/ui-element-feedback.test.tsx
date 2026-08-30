import { FeedbackProvider, useFeedback } from '@community-go/ui-adapter';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

function FeedbackHarness({ onAction }: Readonly<{ onAction: () => void }>) {
  const { notify } = useFeedback();
  return (
    <button
      type="button"
      onClick={() =>
        notify({
          title: '同步已完成',
          description: '当前页面已获得最新状态。',
          tone: 'success',
          duration: 'persistent',
          action: { label: '查看详情', onPress: onAction },
        })
      }
    >
      发送反馈
    </button>
  );
}

describe('FeedbackProvider', () => {
  it('只通过项目契约入队、执行动作并关闭 Toast', async () => {
    const onAction = vi.fn();
    render(
      <FeedbackProvider closeLabel="关闭反馈">
        <FeedbackHarness onAction={onAction} />
      </FeedbackProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '发送反馈' }));
    expect(await screen.findByText('同步已完成')).toBeVisible();
    expect(screen.getByText('当前页面已获得最新状态。')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    expect(onAction).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '关闭反馈' }));
    expect(screen.queryByText('同步已完成')).not.toBeInTheDocument();
  });
});
