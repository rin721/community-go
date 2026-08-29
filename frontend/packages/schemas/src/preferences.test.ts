import { describe, expect, it } from 'vitest';

import { preferencesSchema } from './preferences';

describe('preferencesSchema', () => {
  it('拒绝未知的界面密度', () => {
    expect(
      preferencesSchema.safeParse({
        interfaceName: 'Community',
        locale: 'zh-CN',
        density: 'dense',
        reduceMotion: false,
      }).success,
    ).toBe(false);
  });
});
