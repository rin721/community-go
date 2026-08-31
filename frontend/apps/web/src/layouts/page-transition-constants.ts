// 页面转场类型与转场 class 的单一来源，与 packages/design-system/src/motion.css 的选择器一一对应。
// 独立于 PageTransition 组件文件，避免破坏 Fast Refresh 的组件文件导出约束。

export const pageTransitionTypes = {
  forward: 'nav-forward',
} as const;

// enter/exit 按过渡类型解析；default 键使用 'none'，保证 hydration/Suspense reveal、
// 浏览器后退等无类型提交不应用任何转场样式（不产生临时行内样式，也不播放动画）。
// 带 nav-forward 类型的导航（侧栏/命令菜单/页内链接）走方向滑动。
export const forwardTransitionClasses = {
  default: 'none',
  'nav-forward': pageTransitionTypes.forward,
} as const;
