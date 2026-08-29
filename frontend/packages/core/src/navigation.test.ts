import { describe, expect, it } from 'vitest';

import { getNavigation, isNavigationHrefActive } from './navigation';

describe('navigation', () => {
  it('根路由不会错误匹配所有页面', () => {
    expect(isNavigationHrefActive('/states', '/')).toBe(false);
    expect(isNavigationHrefActive('/', '/')).toBe(true);
  });

  it('导航 ID 与地址保持唯一', () => {
    const navigation = getNavigation();
    expect(new Set(navigation.map((item) => item.id)).size).toBe(navigation.length);
    expect(new Set(navigation.map((item) => item.href)).size).toBe(navigation.length);
  });
});
