---
title: Nuxt 路由与布局
description: 说明页面路由、导航入口、布局壳和 docs 静态路由的关系。
order: 30
category: project
navigation:
  icon: route
---

# Nuxt 路由与布局

应用使用 Nuxt 文件路由。公开页面位于 `app/pages/`，设置等较复杂区域拆分为多页，并通过共享壳组件保持导航和标题一致。

## 主导航

`useAoiNavigation()` 输出桌面侧栏和移动底部导航。桌面侧栏承载更多入口，包括 `/docs`；移动底部四格只保留首页、分类、关注和搜索，避免稀释高频浏览动作。

普通链接、卡片链接、标签链接和导航链接统一使用 `AoiLink`。按钮式导航使用 `AoiButton` 或 `AoiIconButton` 的 `to` / `href` 能力，由它们委托给 `AoiLink`。

## Docs 路由

`app/pages/docs/[[...slug]].vue` 接管 `/docs` 和 `/docs/**`。页面根据当前 locale 选择 Nuxt Content collection，找不到对应语言时回退到中文 collection。

```ts
const collectionByLocale = {
  "zh-CN": "docsZhCn",
  en: "docsEn",
  ja: "docsJa"
}
```

## 静态渲染

`nuxt.config.ts` 对 `/docs` 与 `/docs/**` 设置 `prerender: true`。docs 页面在服务端收集导航路径并调用 `prerenderRoutes()`，让动态 Markdown slug 能进入静态构建。
