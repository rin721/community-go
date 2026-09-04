import { describe, expect, it } from 'vitest';

import { getSemanticColorThemeTokens, semanticColors } from './semantic-colors';
import { getThemeScaleTokens } from './theme-scale';
import { getMotionTokenSource } from './motion';
import {
  motionTokenSourceSchema,
  semanticColorTokenSourceSchema,
  themeScaleTokenSourceSchema,
} from './token-source.schema';

describe('design token source', () => {
  it('semantic color source 通过 schema 且 light/dark 角色集合一致', () => {
    const colors = getSemanticColorThemeTokens();
    const parsed = semanticColorTokenSourceSchema.safeParse(colors);
    expect(parsed.success).toBe(true);
    expect(Object.keys(semanticColors.light)).toEqual(Object.keys(semanticColors.dark));
  });

  it('light 与 dark 语义色值互不相同（dark 确有独立色板）', () => {
    const lightValues = Object.values(semanticColors.light) as readonly string[];
    const darkValues = Object.values(semanticColors.dark) as readonly string[];
    expect(lightValues.some((value, index) => value !== darkValues[index])).toBe(true);
  });

  it('theme scale source 通过 schema 且数值合法', () => {
    const scale = getThemeScaleTokens();
    const parsed = themeScaleTokenSourceSchema.safeParse(scale);
    expect(parsed.success).toBe(true);
    expect(scale.radii.control).toBe('0.75rem');
    expect(scale.spacings.control).toBe('2.75rem');
    expect(scale.zIndices.toast).toBe('60');
  });

  it('motion source 通过 schema 且用途语义引用基础档位', () => {
    const motion = getMotionTokenSource();
    const parsed = motionTokenSourceSchema.safeParse(motion);
    expect(parsed.success).toBe(true);
    expect(motion.durationPurpose.control).toBe('var(--motion-duration-fast)');
    expect(motion.durationProgress['progress-cycle']).toBe('1.1s');
  });
});
