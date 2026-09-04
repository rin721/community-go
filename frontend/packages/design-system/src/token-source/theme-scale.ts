/**
 * Design System —— Theme Scale Token Source（@theme 数值与映射）。
 *
 * Source of Truth：本文件是 @theme 内非颜色数值/映射的正式来源；
 * tokens.css 是其生成的 Artifact（`pnpm codegen:tokens`），不允许人工维护。
 */

/** 基础字体族（--font-sans）。 */
export const fontSans = "'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif";

/** 语义圆角（--radius-*）：控件 / 面板 / Shell。 */
export const radii = {
  control: '0.75rem',
  panel: '1rem',
  shell: '1.25rem',
} as const;

/** 空间与尺寸（--spacing-*）：控件高度、图标、focus ring、浮层宽度等。 */
export const spacings = {
  'control-sm': '2.25rem',
  control: '2.75rem',
  'control-lg': '3rem',
  'progress-bar': '0.1875rem',
  'icon-sm': '1rem',
  icon: '1.25rem',
  'icon-lg': '1.5rem',
  option: '2.5rem',
  overlay: '18rem',
  'focus-ring-width': '0.125rem',
  'focus-ring-offset': '0.125rem',
} as const;

/** 阴影（--shadow-*）：浮层与真实脱离页面平面的层级。 */
export const shadows = {
  panel: '0 1px 2px rgb(15 23 42 / 0.04), 0 12px 32px rgb(15 23 42 / 0.06)',
  overlay: '0 24px 64px rgb(15 23 42 / 0.18)',
} as const;

/** 产品缓动曲线（--ease-product）。 */
export const easeProduct = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** Z-index 层级（--z-index-*）。 */
export const zIndices = {
  shell: '20',
  sticky: '30',
  overlay: '50',
  toast: '60',
} as const;

/**
 * @theme 内 transition-duration 用途映射（引用 :root motion 变量）。
 * default 无显式 duration 的 transition-* 统一归 control 语义。
 */
export const transitionDurations = {
  fast: 'var(--motion-duration-fast)',
  standard: 'var(--motion-duration-standard)',
  slow: 'var(--motion-duration-slow)',
  page: 'var(--motion-duration-page)',
} as const;

export type ThemeScaleTokens = Readonly<{
  fontSans: string;
  radii: typeof radii;
  spacings: typeof spacings;
  shadows: typeof shadows;
  easeProduct: string;
  zIndices: typeof zIndices;
  transitionDurations: typeof transitionDurations;
}>;

/** 供 generator 与一致性检查消费。 */
export function getThemeScaleTokens(): ThemeScaleTokens {
  return {
    fontSans,
    radii,
    spacings,
    shadows,
    easeProduct,
    zIndices,
    transitionDurations,
  };
}
