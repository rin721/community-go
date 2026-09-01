// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminBulkActionBar, AdminCollection } from './collection';
import { AdminEntitySummary, AdminSettingsLayout, AdminTimeline } from './detail-settings';
import { AdminPage, AdminPageHeader, AdminSection } from './layout';
import {
  AdminPageLoadingSurface,
  AdminStateRegion,
  type AdminViewState,
} from './states-operations';

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

  it.each<AdminViewState>(['ready', 'refreshing', 'background', 'partial', 'readonly'])(
    'AdminStateRegion 在 %s 阶段保留内容实例',
    (state) => {
      const { getByRole, getByText, queryByText, unmount } = render(
        <AdminStateRegion
          content={<p>stable content</p>}
          denied={<p>denied</p>}
          empty={<p>empty</p>}
          error={<p>error</p>}
          label="Admin readiness"
          loading={<p>loading</p>}
          partialNotice={<p>partial</p>}
          pending={<p>pending</p>}
          readonlyNotice={<p>readonly</p>}
          refreshing={<p>refreshing</p>}
          state={state}
        />,
      );

      const region = getByRole('region', { name: 'Admin readiness' });
      expect(getByText('stable content')).toBeTruthy();
      if (state === 'refreshing') expect(region.getAttribute('aria-busy')).toBe('true');
      if (state === 'background') expect(queryByText('refreshing')).toBeNull();
      unmount();
    },
  );

  it.each(['page', 'catalog', 'collection', 'form'] as const)(
    'AdminPageLoadingSurface 提供 %s 稳定结构',
    (kind) => {
      const { getByRole, unmount } = render(
        <AdminPageLoadingSurface kind={kind} label={`${kind} loading`} />,
      );
      expect(
        getByRole('status', { name: `${kind} loading` }).getAttribute('data-loading-kind'),
      ).toBe(kind);
      unmount();
    },
  );
});
