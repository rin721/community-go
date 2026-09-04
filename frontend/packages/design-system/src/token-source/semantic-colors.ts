/**
 * Design System —— Semantic Color Token Source（Light / Dark）。
 *
 * Source of Truth：本文件的 `semanticColors` 是 Semantic Color Roles 的
 * 唯一事实来源；`packages/design-system/src/tokens.css` 是其生成的 Artifact
 * （`pnpm codegen:tokens`），不允许人工维护。
 *
 * 角色集合受控（Accent/Surface/Text/Border/Success/Warning/Danger/Info/Focus
 * 与派生强度 -soft/-strong/on-*）；新增/修改角色必须改本文件并重新生成。
 */

export const semanticColors = {
  light: {
    canvas: '#f6f7fb',
    surface: '#ffffff',
    'surface-raised': '#ffffff',
    'surface-muted': '#f0f2f7',
    'surface-inset': '#e9ecf3',
    border: '#e4e7ee',
    'border-strong': '#cfd5df',
    ink: '#172033',
    'ink-muted': '#596579',
    brand: '#5d49d6',
    'brand-strong': '#4e3bc3',
    'brand-soft': '#eeebff',
    success: '#10703f',
    'success-soft': '#e8f7ef',
    warning: '#b54708',
    'warning-soft': '#fff2df',
    danger: '#c4323d',
    'danger-soft': '#ffeaec',
    info: '#2463eb',
    'info-soft': '#e9f0ff',
    'on-brand': '#ffffff',
    'on-success': '#ffffff',
    'on-warning': '#2b1600',
    'on-danger': '#ffffff',
    'on-info': '#ffffff',
    'focus-ring': '#5d49d6',
    scrim: 'rgb(15 23 42 / 0.38)',
  },
  dark: {
    canvas: '#0d111c',
    surface: '#141a27',
    'surface-raised': '#1a2232',
    'surface-muted': '#20293a',
    'surface-inset': '#101622',
    border: '#273247',
    'border-strong': '#36435b',
    ink: '#f5f7fb',
    'ink-muted': '#9aa6ba',
    brand: '#9b8cff',
    'brand-strong': '#b0a5ff',
    'brand-soft': '#29244d',
    success: '#57d08b',
    'success-soft': '#153827',
    warning: '#f3b55a',
    'warning-soft': '#3d2d18',
    danger: '#ff7a86',
    'danger-soft': '#422129',
    info: '#78a5ff',
    'info-soft': '#192d55',
    'on-brand': '#17122d',
    'on-success': '#082416',
    'on-warning': '#2a1800',
    'on-danger': '#2d1015',
    'on-info': '#0b1b3a',
    'focus-ring': '#b0a5ff',
    scrim: 'rgb(0 0 0 / 0.58)',
  },
} as const;

/** Semantic color role key（light/dark 必须同 keys）。 */
export type SemanticColorRole = keyof typeof semanticColors.light;

export type SemanticColorTokens = Readonly<Record<SemanticColorRole, string>>;

/** Light/Dark 主题语义色（供 generator 与一致性检查消费）。 */
export type SemanticColorThemeTokens = Readonly<{
  light: SemanticColorTokens;
  dark: SemanticColorTokens;
}>;

export function getSemanticColorThemeTokens(): SemanticColorThemeTokens {
  const lightKeys = Object.keys(semanticColors.light).sort();
  const darkKeys = Object.keys(semanticColors.dark).sort();
  if (JSON.stringify(lightKeys) !== JSON.stringify(darkKeys)) {
    throw new Error('Token Source 非法：light/dark Semantic Color 角色集合必须一致');
  }
  return semanticColors;
}
