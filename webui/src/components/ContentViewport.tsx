import { type ReactNode } from "react";
import type { ThemeExperience } from "../theme";
import { ScrollExperience } from "../scroll/ScrollExperience";

// ContentWidth 是业务内容的宽度语义档（086 REQ-086-003/005）：
// 缺省 wide 全宽；detail/settings/form 依据页面类型收窄（data-page-width 写属性，
// 最大宽度由 styles.css component tokens 决定，页面不自行设置 max-width）。
export type ContentWidth = "wide" | "detail" | "settings" | "form";

// ContentViewport 是业务路由内容唯一滚动/宽度容器（086）：
// AppShell 根布局只渲染公共框架；业务路由只在这里渲染。fallback 普通路由与
// mounted panel 共用同一容器，消除 .page-viewport/.workspace-panel-scroll 双
// padding 复制；滚动容器与 data-page-width 语义只此一处定义。
export function ContentViewport({ pageWidth = "wide", experience, reducedMotion, panelProps, children }: {
  pageWidth?: ContentWidth;
  experience: ThemeExperience;
  reducedMotion: boolean;
  panelProps?: { id?: string; role?: string; ariaLabelledby?: string };
  children: ReactNode;
}) {
  return <ScrollExperience target="panel" experience={experience} reducedMotion={reducedMotion} pageWidth={pageWidth} panelProps={panelProps}>{children}</ScrollExperience>;
}