import { z } from 'zod';

export const preferencesSchema = z.object({
  interfaceName: z.string().trim().min(2).max(40),
  locale: z.enum(['zh-CN', 'en']),
  density: z.enum(['comfortable', 'compact']),
  reduceMotion: z.boolean(),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;
