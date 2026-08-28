# 086 唯一 Design Token 系统与公共框架几何稳定化

## 状态

**研究门禁已通过；计划待确认。**

顶部标签栏（085）与公共框架暴露了样式体系的结构性问题：宿主与业务 CSS 大量散落
magic values、重复语义值、页面级覆盖与 HeroUI 默认值混用，light/dark/preset/density
切换缺少统一 token 管道，公共 Shell 在不同路由下几何不稳定。本变更建立唯一的
Design Token 系统（primitive → semantic → component 三级），并让 AppShell 由根布局
唯一渲染、业务路由只渲染 ContentViewport；逐组件清扫裸 px/hex/!important 与死规则，
禁止通过写死 CSS 数值或页面特例补偿解决。

## 研究结论（摘要）

见 [R086-001](research/R086-001-current-style-audit/report.md)：styles.css 3363 行
token/规则混排；Shell/Tabs/Sidebar 约 105 处裸 px；8 处 !important；若干裸 hex；
`--shell-tabs-height: 42px` 等为准裸值 token；`data-page-width` 无生产端；density 散点
覆盖；模块 CSS 大量 `:global` 与裸值；fallback/panel 双 padding 复制。

## 阅读顺序

1. [研究档案](research/R086-001-current-style-audit/report.md)
2. [需求](requirements.md)
3. [设计](design.md)
4. [任务与确认状态](tasks.md)