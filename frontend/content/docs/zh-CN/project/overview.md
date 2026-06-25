---
title: 项目概览
description: aoi-web 是前端优先的 Nuxt 4 视频社区应用，当前以本地 mock API 和浏览器状态为主。
order: 10
category: project
navigation:
  icon: layout-dashboard
---

# 项目概览

`aoi-web` 是一个 Nuxt 4 前端优先应用，面向视频社区、创作者主页、投稿、播放、弹幕和设置体验。当前阶段以本地 mock API 与浏览器本地状态为主，同时保留面向未来 Go 后端的 DTO 契约。

## 技术栈

- Nuxt 4、Vue 3、TypeScript 和 Composition API。
- Pinia 管理客户端状态。
- `@nuxtjs/i18n` 提供三语界面，默认语言 `zh-CN`，策略 `no_prefix`。
- `@nuxt/icon` 使用本地 Lucide 图标集合。
- Material Web 只通过本地 Aoi wrapper 暴露给业务页面。
- Nuxt Content 为 `/docs` 渲染 Markdown 静态文档。

## 产品边界

应用当前不实现生产后端。`server/api/mock/` 只承载 mock 接口，目的是让前端流程接近未来 API 契约，而不是提前扩展服务端能力。

长期产品、架构、UI、API 或交互约束优先记录在聚合仓库根目录 `AGENTS.md`。临时研究、阶段计划和一次性说明不应重新沉淀成分散规则文件。

## 主要用户流

首页、搜索、分类、关注流、收藏、历史、视频播放、投稿和设置组成当前主路径。文档站是公开入口，但只加到桌面侧栏；移动底部四格导航保持聚焦在核心浏览动作。
