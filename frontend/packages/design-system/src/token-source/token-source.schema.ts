/**
 * Design System —— Token Source 结构契约（zod 校验）。
 *
 * Token Source 是 Schema-Controlled Source：本文件定义其结构契约并导出解析器，
 * 供 generator（tooling/token-codegen）与一致性测试在加载 token-source 时校验。
 * 具体值事实仍由 token-source/*.ts 拥有（Authority-owned），不复制到 schemas。
 */

import { z } from 'zod';

/** CSS 值（颜色 / 长度 / 引用）。 */
const cssValue = z.string().min(1);

/** 字符串键 → CSS 值映射（zod 4 record 需显式 key schema）。 */
const cssRecord = z.record(z.string(), cssValue);

/** Semantic Color 角色表：light/dark keys 必须一致。 */
export const semanticColorTokenSourceSchema = z
  .object({
    light: cssRecord,
    dark: cssRecord,
  })
  .refine((source) => {
    const lightKeys = Object.keys(source.light).sort();
    const darkKeys = Object.keys(source.dark).sort();
    return JSON.stringify(lightKeys) === JSON.stringify(darkKeys);
  }, 'light/dark Semantic Color 角色集合必须一致');

export type SemanticColorTokenSource = z.infer<typeof semanticColorTokenSourceSchema>;

/** @theme 数值源（radius/spacing/shadow/z-index/transition 映射）。 */
export const themeScaleTokenSourceSchema = z.object({
  fontSans: cssValue,
  radii: cssRecord,
  spacings: cssRecord,
  shadows: cssRecord,
  easeProduct: cssValue,
  zIndices: cssRecord,
  transitionDurations: cssRecord,
});

export type ThemeScaleTokenSource = z.infer<typeof themeScaleTokenSourceSchema>;

/** Motion Token 源。 */
export const motionTokenSourceSchema = z.object({
  durationBase: cssRecord,
  durationPurpose: cssRecord,
  distances: cssRecord,
  delayRoute: cssRecord,
  durationProgress: cssRecord,
});

export type MotionTokenSource = z.infer<typeof motionTokenSourceSchema>;
