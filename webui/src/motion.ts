// 项目动效时长与 easing 的 TS 侧唯一常量，与 styles.css 的 motion token 同源。
// overlay phase 超时、进场/退场时序必须从这里取，不允许在组件内散落数字。
export const motionDurations = {
  quick: 120,
  standard: 180,
  layout: 240,
} as const;

export type MotionDuration = keyof typeof motionDurations;

export function motionDuration(key: MotionDuration): number {
  return motionDurations[key];
}