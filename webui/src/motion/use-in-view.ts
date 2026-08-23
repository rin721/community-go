import { useEffect, useRef, useState } from "react";

// useInView 用 IntersectionObserver 观察元素进入视口；observer 不可用（测试/旧环境）
// 时回退为立即可见，保证静态渲染与独立测试不会永久停留在隐藏态。
export type UseInViewOptions = { rootMargin?: string; threshold?: number; once?: boolean };

export function useInView<T extends HTMLElement>({ rootMargin = "0px 0px -8% 0px", threshold = 0.01, once = true }: UseInViewOptions = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setInView(true);
        if (once) observer.disconnect();
      } else if (!once) {
        setInView(false);
      }
    }, { rootMargin, threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);
  return { ref, inView };
}