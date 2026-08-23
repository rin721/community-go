// ScrollHijack 实现显式滚动场景劫持（067）：声明 data-scroll-hijack="x"（或 "y"）的容器
// 把纵向（横向）滚轮输入转换为容器内的横向（纵向）滚动，preventDefault 避免与页面滚动叠加。

export type ScrollHijackDirection = "x" | "y";

export type HijackableElement = HTMLElement & { dataset: { scrollHijack?: string } };

// isHijackTarget 判断元素是否声明了劫持方向。
export function isHijackTarget(element: HTMLElement): element is HijackableElement {
  const direction = element.dataset.scrollHijack;
  return direction === "x" || direction === "y";
}

// hijackScroll 为容器注册滚轮劫持；返回卸载函数。
export function hijackScroll(container: HTMLElement, direction: ScrollHijackDirection): () => void {
  const handler = (event: WheelEvent) => {
    if (!(event.target instanceof Node) || !container.contains(event.target)) return;
    if (direction === "x") {
      const canHorizontal = container.scrollWidth > container.clientWidth;
      if (!canHorizontal) return;
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY) && event.deltaX !== 0) return;
      event.preventDefault();
      container.scrollLeft += event.deltaY;
      return;
    }
    const canVertical = container.scrollHeight > container.clientHeight;
    if (!canVertical) return;
    if (Math.abs(event.deltaY) >= Math.abs(event.deltaX) && event.deltaY !== 0) return;
    event.preventDefault();
    container.scrollTop += event.deltaX;
  };
  container.addEventListener("wheel", handler, { passive: false });
  return () => container.removeEventListener("wheel", handler);
}

// hijackHorizontalTarget 便捷函数：按 data-scroll-hijack 方向应用劫持。
export function applyScrollHijack(element: HTMLElement): (() => void) | null {
  if (!isHijackTarget(element)) return null;
  return hijackScroll(element, element.dataset.scrollHijack as ScrollHijackDirection);
}