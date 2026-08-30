// productMotion 为 JavaScript 动画库提供与 CSS Semantic Token 相同的时长与缓动语义。
export const productMotion = {
  durationSeconds: {
    fast: 0.12,
    standard: 0.18,
    slow: 0.24,
  },
  easing: [0.2, 0.8, 0.2, 1] as const,
} as const;
