/**
 * Design System —— Motion Token Source（:root 内 motion 数值与用途语义）。
 *
 * Source of Truth：本文件是 motion 数值档位（duration/distance/delay）、用途
 * 语义映射与 debug scale 的正式来源；tokens.css 是其生成的 Artifact。
 *
 * 权威关系（docs/motion-foundation.md）：
 * - 基础档位（fast/standard/slow）受 development 慢速倍率（--motion-debug-scale）控制；
 * - 用途语义（control/feedback/page/progress）按交互用途引用，不按数值引用。
 */

/** 基础时长档位（毫秒）。 */
export const motionDurationBase = {
  fast: '120ms',
  standard: '180ms',
  slow: '240ms',
} as const;

/** 用途语义档位 → 基础档位引用。 */
export const motionDurationPurpose = {
  control: 'var(--motion-duration-fast)', // 组件自身状态动效（hover/press/switch 等）
  feedback: 'var(--motion-duration-standard)', // 反馈/异步状态动效
  page: 'var(--motion-duration-slow)', // 页面级转场
} as const;

/** 位移距离（--motion-distance-*）。 */
export const motionDistances = {
  reveal: '0.5rem', // 内容/区域进场抬升位移（content.enter 配方）
  enter: '1.5rem', // 页面内容方向进入位移（forward 方向 recipe）
} as const;

/** Route content.enter 前置 delay 语义（方向/无方向统一 feedback 档）。 */
export const motionDelayRoute = {
  forward: 'var(--motion-duration-feedback)',
  content: 'var(--motion-duration-feedback)',
} as const;

/**
 * Top Progress 档位（Host Top Progress 消费）：
 * progress 是 Enter/Complete/Exit 短档位（feedback 语义）；
 * progress-cycle 是"从左侧持续延伸"的完整循环周期（1.1s 克制反馈节奏）。
 */
export const motionDurationProgress = {
  progress: 'var(--motion-duration-feedback)',
  'progress-cycle': '1.1s',
} as const;

export type MotionTokenSource = Readonly<{
  durationBase: typeof motionDurationBase;
  durationPurpose: typeof motionDurationPurpose;
  distances: typeof motionDistances;
  delayRoute: typeof motionDelayRoute;
  durationProgress: typeof motionDurationProgress;
}>;

/** 供 generator 与一致性检查消费。 */
export function getMotionTokenSource(): MotionTokenSource {
  return {
    durationBase: motionDurationBase,
    durationPurpose: motionDurationPurpose,
    distances: motionDistances,
    delayRoute: motionDelayRoute,
    durationProgress: motionDurationProgress,
  };
}
