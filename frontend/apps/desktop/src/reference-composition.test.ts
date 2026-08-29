import { createReferenceFeature, getReferenceRecords } from '@community-go/reference';
import { describe, expect, it, vi } from 'vitest';

import { createDesktopHost, type DesktopRuntimePort } from './desktop-runtime';

describe('Desktop Reference composition', () => {
  it('共享 Feature 只看到 Host Port，不出现平台条件分支', async () => {
    const saveText = vi.fn().mockResolvedValue(undefined);
    const runtime: DesktopRuntimePort = {
      platform: 'linux',
      window: { execute: vi.fn().mockResolvedValue(undefined) },
      shortcuts: { register: vi.fn() },
      files: { select: vi.fn().mockResolvedValue([]), saveText },
    };
    const feature = createReferenceFeature(createDesktopHost(runtime));

    await feature.exportSnapshot(getReferenceRecords().slice(0, 1));

    expect(saveText).toHaveBeenCalledOnce();
  });
});
