import { DataTable, type DataColumn } from '@community-go/ui-adapter';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

type TestRow = Readonly<{ id: string; name: string }>;

const columns: readonly DataColumn<TestRow>[] = [
  {
    id: 'name',
    label: '名称',
    rowHeader: true,
    render: (row) => row.name,
  },
];

describe('Data Display Family', () => {
  it('未声明 selection 时保持为纯展示表格', () => {
    render(
      <DataTable
        label="能力清单"
        columns={columns}
        emptyContent="没有能力"
        rows={[{ id: 'capability-1', name: 'Semantic Tokens' }]}
      />,
    );

    expect(screen.getByRole('grid', { name: '能力清单' })).toBeVisible();
    expect(screen.getByRole('rowheader', { name: 'Semantic Tokens' })).toBeVisible();
    expect(screen.getAllByRole('row')[1]).not.toHaveAttribute('aria-selected');
  });

  it('空集合保留表格语义并呈现调用方文案', () => {
    render(<DataTable label="能力清单" columns={columns} emptyContent="没有能力" rows={[]} />);

    expect(screen.getByRole('grid', { name: '能力清单' })).toBeVisible();
    expect(screen.getByText('没有能力')).toBeVisible();
  });
});
