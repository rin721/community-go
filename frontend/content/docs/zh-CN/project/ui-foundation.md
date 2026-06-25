---
title: UI、Token、Motion 与 Layer
description: 说明 Aoi UI 的 token、响应式、动效、层级和可访问性约束。
order: 40
category: project
navigation:
  icon: palette
---

# UI、Token、Motion 与 Layer

Aoi UI 以本地 wrapper、CSS token 和共享布局规则为基础。业务页面应使用已有 Aoi 组件，不直接耦合 Material Web 的实现细节。

## Token

颜色、圆角、阴影、尺寸、层级和状态变量集中在 `app/assets/css/tokens.css` 与 `app/assets/css/main.css`。新增视觉规则时优先复用变量，避免在页面里制造孤立色值。

## Wrapper 规则

Material Web 的导入集中在 `app/plugins/material-web.client.ts`。Aoi wrapper 负责统一尺寸、intent、focus、loading、链接行为和可访问标签。

```vue
<AoiButton icon="upload" intent="primary">
  发布
</AoiButton>
```

## Motion

交互动效应尊重 `prefers-reduced-motion`，并避免依赖动效表达必要状态。滚动、Reveal、Skeleton、弹幕和播放器控件都需要在低动效环境里保持可理解。

## Layer

对话框、菜单、浮层、导航、加载层等层级由本地 layer 规则协调。新增浮层时优先复用 `AoiDialog`、`AoiMenu`、`AoiLightboxGallery` 或播放器相关组件。
