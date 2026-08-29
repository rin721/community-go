import { describe, expect, it, vi } from 'vitest';

import {
  createReferenceFeature,
  filterReferenceRecords,
  getReferenceRecords,
} from './reference-workspace';

describe('reference workspace', () => {
  it('在纯模型层组合查询过滤而不依赖 Host', () => {
    const result = filterReferenceRecords(getReferenceRecords(), {
      query: 'Lin Chen',
      status: 'healthy',
      region: 'apac',
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((record) => record.status === 'healthy' && record.region === 'apac')).toBe(
      true,
    );
  });

  it('通过显式 Port 导出快照', async () => {
    const exportTextFile = vi.fn().mockResolvedValue(undefined);
    const feature = createReferenceFeature({ exportTextFile });

    await feature.exportSnapshot(getReferenceRecords().slice(0, 2));

    expect(exportTextFile).toHaveBeenCalledWith(
      'frontend-reference-snapshot.json',
      expect.stringContaining('"recordCount": 2'),
    );
  });
});
