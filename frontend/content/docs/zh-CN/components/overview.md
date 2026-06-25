---
title: 组件总览
description: Aoi wrapper 是业务 UI 与 Material Web、播放器、弹幕和富交互能力之间的稳定边界。
order: 100
category: components
navigation:
  icon: blocks
---

# 组件总览

`app/components/aoi/` 下的 Aoi wrapper 是业务页面的默认 UI 入口。它们统一 token、尺寸、intent、链接、焦点、SSR 安全和可访问性，让业务代码不直接依赖底层实现。

## 分类

- [Actions](/docs/components/actions)：按钮、链接、图标按钮、动作条和媒体叠层按钮。
- [Forms](/docs/components/forms)：输入、选择、开关、上传、调色板和富文本编辑。
- [Layout & Content](/docs/components/layout-content)：Surface、Section、Grid、LazyMount、Scroll、Skeleton 和内容展示。
- [Feedback](/docs/components/feedback)：进度、状态消息和加载反馈。
- [Overlays](/docs/components/overlays)：Dialog、Menu、Lightbox 和播放器上下文菜单。
- [Media Player](/docs/components/media-player)：播放器布局、控制条、时间轴、队列和视频组件。
- [Danmaku, Motion & Rich Text](/docs/components/danmaku-motion-rich-text)：弹幕、滚动场景、Reveal、RichText 和编辑器。

## 使用原则

业务页面不要直接使用 `md-*` Material Web 元素。普通链接使用 `AoiLink`，命令按钮使用 `AoiButton`，图标按钮使用 `AoiIconButton`。如果能力缺失，优先扩展 wrapper，而不是在页面局部绕过它。

::docs-callout{title="开发者实验台" intent="tip" icon="flask-conical"}
`/settings/components` 仍然是交互实验台，适合调试视觉状态；`/docs` 是面向长期维护的说明、API 表和示例入口。
::
