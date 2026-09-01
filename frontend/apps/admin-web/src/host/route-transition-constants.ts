export const pageTransitionTypes = {
  forward: 'nav-forward',
} as const;

/** markForwardRouteIntent 在 Router 提交前记录 Host 导航意图，供真实 DOM 内容进场选择延迟。 */
export function markForwardRouteIntent() {
  document.documentElement.dataset.routeIntent = 'forward';
}

export const routeTransitionClasses = {
  default: 'route-content-ready',
  'nav-forward': pageTransitionTypes.forward,
} as const;
