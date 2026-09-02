import { describe, expect, it } from 'vitest';

import { adminNavigationIconVocabulary } from '@community-go/admin-surface/shell';
import { Circle } from 'lucide-react';

import {
  resolveNavigationIcon,
  UNKNOWN_ADMIN_NAVIGATION_ICON,
} from '../shell/navigation-icon-resolver';

describe('Shell navigation icon resolver', () => {
  it('vocabulary 全覆盖：每个语义 iconId 都解析到非 fallback 组件', () => {
    for (const iconId of adminNavigationIconVocabulary) {
      const resolved = resolveNavigationIcon(iconId);
      expect(resolved).not.toBe(Circle);
      expect(typeof resolved).toBe('object');
    }
  });

  it('未声明 iconId（undefined）→ 统一 fallback（Circle）', () => {
    expect(resolveNavigationIcon(undefined)).toBe(Circle);
  });

  it('未知 iconId → deterministic throw UNKNOWN_ADMIN_NAVIGATION_ICON（不静默 fallback）', () => {
    expect(() => resolveNavigationIcon('nope')).toThrow(UNKNOWN_ADMIN_NAVIGATION_ICON);
  });
});
