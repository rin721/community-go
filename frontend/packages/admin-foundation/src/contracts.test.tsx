// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminBulkActionBar, AdminCollection } from './collection';
import { AdminEntitySummary, AdminSettingsLayout, AdminTimeline } from './detail-settings';
import { AdminPage, AdminPageHeader, AdminSection } from './layout';

describe('Admin Surface contracts', () => {
  it('组合页面、Collection 与批量操作区域', () => {
    render(
      <AdminPage>
        <AdminPageHeader description="deterministic" title="Resource list" />
        <AdminCollection content={<p>rows</p>} filters={<p>filters</p>} title="Collection" />
        <AdminBulkActionBar
          actions={<button type="button">archive</button>}
          clearLabel="clear"
          onClear={() => undefined}
          selectionLabel="2 selected"
        />
      </AdminPage>,
    );
    expect(screen.getByRole('heading', { name: 'Resource list' })).toBeTruthy();
    expect(screen.getByRole('toolbar', { name: '2 selected' })).toBeTruthy();
  });

  it('组合详情、设置与时间线语义', () => {
    render(
      <AdminSettingsLayout navigation={<p>settings navigation</p>}>
        <AdminEntitySummary title="Entity" />
        <AdminSection title="History">
          <AdminTimeline
            items={[{ id: 'event', title: 'Created', tone: 'success' }]}
            label="Entity timeline"
          />
        </AdminSection>
      </AdminSettingsLayout>,
    );
    expect(screen.getByRole('heading', { name: 'Entity' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Entity timeline' })).toBeTruthy();
  });
});
