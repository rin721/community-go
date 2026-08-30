import {
  Action,
  ConfirmDialog,
  IconAction,
  RadioGroupField,
  ToggleGroup,
} from '@community-go/ui-adapter';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Action Family', () => {
  it('Action 暴露项目 Variant、尺寸和真实命令行为', () => {
    const onPress = vi.fn();
    render(
      <Action onPress={onPress} size="lg" trailingIcon={<span>→</span>} variant="danger">
        删除记录
      </Action>,
    );

    const action = screen.getByRole('button', { name: '删除记录' });
    fireEvent.click(action);

    expect(onPress).toHaveBeenCalledOnce();
    expect(action).toHaveClass('h-control-lg', 'bg-danger', 'text-on-danger');
  });

  it('Pending 与 Disabled 都阻止重复动作并保留状态语义', () => {
    render(
      <>
        <Action disabled loading>
          正在保存
        </Action>
        <IconAction disabled label="通知不可用">
          ×
        </IconAction>
      </>,
    );

    expect(screen.getByRole('button', { name: '正在保存' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '正在保存' })).toHaveAttribute(
      'data-pending',
      'true',
    );
    expect(screen.getByRole('button', { name: '通知不可用' })).toBeDisabled();
  });

  it('ToggleGroup 使用受控 Selection，而不是相邻 Button 的视觉伪装', () => {
    const onSelectionChange = vi.fn();
    render(
      <ToggleGroup
        label="界面密度"
        onSelectionChange={onSelectionChange}
        options={[
          { id: 'comfortable', label: '舒适' },
          { id: 'compact', label: '紧凑' },
        ]}
        selectedIds={['comfortable']}
      />,
    );

    expect(screen.getByRole('radiogroup', { name: '界面密度' })).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: '紧凑' }));

    expect(onSelectionChange).toHaveBeenCalledWith(['compact']);
  });

  it('RadioGroupField 提供单选 Field 语义并阻止禁用选项', () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroupField
        label="执行模式"
        onValueChange={onValueChange}
        options={[
          { value: 'observe', label: '观察' },
          { value: 'guided', label: '引导' },
          { value: 'automatic', label: '自动', disabled: true },
        ]}
        value="observe"
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: '引导' }));
    expect(onValueChange).toHaveBeenCalledWith('guided');
    expect(screen.getByRole('radio', { name: '自动' })).toBeDisabled();
  });

  it('ConfirmDialog 在异步确认期间阻止重复动作并在成功后关闭', async () => {
    let resolveConfirm: (() => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    render(
      <ConfirmDialog
        cancelLabel="取消"
        confirmLabel="确认删除"
        description="此操作需要确认"
        failureMessage="删除失败"
        impact="仅影响当前记录"
        title="删除记录？"
        tone="danger"
        triggerLabel="打开危险确认"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开危险确认' }));
    const confirmAction = await screen.findByRole('button', { name: '确认删除' });
    fireEvent.click(confirmAction);

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(confirmAction).toBeDisabled();
    resolveConfirm?.();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
