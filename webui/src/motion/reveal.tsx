import { Children, Fragment, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useInView } from "./use-in-view";
import type { RevealRhythm } from "../theme";

// RevealRhythm 是弹入响应节奏档位：calm（克制）/ balanced（均衡）/ playful（活泼）。
// 每档派生 duration / offset / ease，经 CSS 变量落到 [data-reveal] 的 transition。
// 类型与 ThemePreferences.experience.revealRhythm 同源（webui/src/theme.ts）。
export type { RevealRhythm };

export const revealRhythms: Record<RevealRhythm, { durationMs: number; offsetPx: number; ease: string }> = {
  calm: { durationMs: 520, offsetPx: 14, ease: "cubic-bezier(0.22, 1, 0.36, 1)" },
  balanced: { durationMs: 380, offsetPx: 22, ease: "cubic-bezier(0.16, 1, 0.3, 1)" },
  playful: { durationMs: 300, offsetPx: 34, ease: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
};

// revealStaggerStep 是 RevealList 列表项之间的递进间隔（stagger 节奏）。
export const revealStaggerStep = 70;

// readRevealEnabled 读取派生配置：data-motion=reduce 或 experience.reveal=false 时关闭
// 弹入（元素直接可见）；属性缺失（测试/静态渲染）同样视为关闭，避免隐藏态卡住内容。
export function readRevealEnabled(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  if (root.dataset.motion === "reduce") return false;
  return root.dataset.experienceReveal === "true";
}

export type RevealProps = {
  as?: ElementType;
  rhythm?: RevealRhythm;
  delayMs?: number;
  staggerIndex?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

// Reveal 是弹入响应原语：元素进入视口时按节奏弹入（translateY/scale + opacity）。
// 关闭/降级时始终渲染可见态；ref 交给使用方组件（section/div 等）。
export function Reveal({ as: Tag = "div", rhythm = "balanced", delayMs = 0, staggerIndex, className = "", style, children }: RevealProps) {
  const [enabled] = useState(readRevealEnabled);
  const { ref, inView } = useInView<HTMLElement>();
  const preset = revealRhythms[rhythm];
  const delay = delayMs + (staggerIndex ?? 0) * revealStaggerStep;
  const shown = !enabled || inView;
  const revealStyle = {
    "--reveal-duration": `${preset.durationMs}ms`,
    "--reveal-ease": preset.ease,
    "--reveal-offset": `${preset.offsetPx}px`,
    "--reveal-delay": `${delay}ms`,
    ...style,
  } as CSSProperties;
  return (
    <Tag ref={ref} data-reveal={shown ? "shown" : "hidden"} data-reveal-rhythm={rhythm} className={className} style={revealStyle}>
      {children}
    </Tag>
  );
}

// RevealList 把列表项按 index 递进 stagger 弹入；子项为空时原样返回。
export function RevealList({ as: Tag = "div", rhythm = "balanced", className = "", children }: { as?: ElementType; rhythm?: RevealRhythm; className?: string; children?: ReactNode }) {
  const items = Children.toArray(children).filter((child) => child !== null && child !== undefined);
  return (
    <Tag className={className}>
      {items.map((child, index) => (
        <Fragment key={index}>
          <Reveal as="div" rhythm={rhythm} staggerIndex={index} className="reveal-list-item">{child}</Reveal>
        </Fragment>
      ))}
    </Tag>
  );
}