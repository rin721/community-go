import { z } from 'zod';

/**
 * system-tools —— 偏好设置表单 Schema（Plugin-owned）。
 *
 * Preferences 自 Host reference/schemas 迁入本插件：字段契约与校验随插件走，
 * 不再依赖 Host 场景模块。仍经 form-foundation（@community-go/schemas
 * FoundationSchema 契约）消费。
 */
export const preferencesSchema = z.object({
  interfaceName: z.string().trim().min(2).max(40),
  locale: z.enum(['zh-CN', 'en']),
  density: z.enum(['comfortable', 'compact']),
  reduceMotion: z.boolean(),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;
