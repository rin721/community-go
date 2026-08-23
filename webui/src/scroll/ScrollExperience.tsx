import { useEffect, useRef, type ReactNode } from "react";
import { SmoothScrollController } from "./smooth-scroll";
import { EdgeBand } from "./edge-band";
import { applyScrollHijack } from "./scroll-hijack";
import { applyMagneticSnap } from "./snap";
import type { ThemeExperience } from "../theme";

// ScrollTarget 决定滚动容器：panel = 工作区 .page-viewport（元素滚动）；
// window = 文档窗口（blank 布局，如登录/设置页）。
export type ScrollTarget = "panel" | "window";

export type ScrollExperienceProps = {
  target: ScrollTarget;
  experience: ThemeExperience;
  reducedMotion: boolean;
  /** panel 模式容器透传属性（id/role/aria-labelledby 等，保持既有 a11y 语义） */
  panelProps?: { id?: string; role?: string; ariaLabelledby?: string };
  children: ReactNode;
};

// ScrollExperience 装配 067 滚动/动效运行时：
// - 阻尼平滑滚动（Lenis 窄封装 SmoothScrollController，w: .page-viewport / w: window）；
// - 边缘阻尼/橡皮筋（panel 模式，作用于 .page-flow）；
// - 磁吸吸附（声明 data-snap-x 的滚动区 + Shell 页签轨 .workspace-tab-scroll）；
// - 显式滚动场景劫持（[data-scroll-hijack="x|y"]，MutationObserver 跟随路由内容变化）。
// reduced-motion 或对应派生配置关闭时相应能力不挂载（回退原生滚动）。
export function ScrollExperience({ target, experience, reducedMotion, panelProps, children }: ScrollExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (target === "window") {
      const controller = new SmoothScrollController();
      controller.attach(window, document.documentElement);
      return () => controller.destroy();
    }
    const container = containerRef.current;
    if (!container) return;
    const content = container.querySelector<HTMLElement>(":scope > .page-flow");
    if (!content) return;

    const controller = new SmoothScrollController();
    controller.attach(container, content);
    const edgeBand = new EdgeBand(container, content, { enabled: experience.edgeDamping && !reducedMotion });
    edgeBand.attach();

    let disposers: Array<() => void> = [];
    const applyScenarios = () => {
      for (const dispose of disposers) dispose();
      disposers = [];
      const hijackEnabled = experience.scrollHijack && !reducedMotion;
      const snapEnabled = experience.magneticSnap && !reducedMotion;
      if (hijackEnabled) {
        container.querySelectorAll<HTMLElement>("[data-scroll-hijack]").forEach((element) => {
          const dispose = applyScrollHijack(element);
          if (dispose) disposers.push(dispose);
        });
      }
      container.querySelectorAll<HTMLElement>("[data-snap-x]").forEach((element) => applyMagneticSnap(element, snapEnabled));
      const tabRail = document.querySelector<HTMLElement>(".workspace-tab-scroll");
      if (tabRail) applyMagneticSnap(tabRail, snapEnabled);
    };
    applyScenarios();
    const observer = new MutationObserver(() => applyScenarios());
    observer.observe(content, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const dispose of disposers) dispose();
      disposers = [];
      edgeBand.destroy();
      controller.destroy();
    };
  }, [target, experience.smoothScroll, experience.damping, experience.edgeDamping, experience.magneticSnap, experience.scrollHijack, reducedMotion]);

  if (target === "window") return <>{children}</>;
  return (
    <div ref={containerRef} className="page-viewport" id={panelProps?.id} role={panelProps?.role} aria-labelledby={panelProps?.ariaLabelledby}>
      <div className="page-flow">{children}</div>
    </div>
  );
}