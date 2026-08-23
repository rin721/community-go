// 磁吸吸附（067）：声明 data-snap-x（或 .snap-x 类）的横向滚动区启用 CSS scroll-snap；
// 吸附节奏由 CSS（scroll-snap-type/scroll-snap-align）表达，运行时只负责开关类。
export function applyMagneticSnap(container: HTMLElement, enabled: boolean): void {
  container.classList.toggle("snap-x", enabled);
}

// isSnapTarget 判断元素是否声明了磁吸吸附。
export function isSnapTarget(element: HTMLElement): boolean {
  return element.hasAttribute("data-snap-x");
}