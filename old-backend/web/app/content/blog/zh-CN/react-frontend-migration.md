---
title: React 前端迁移第一阶段
description: 记录平台控制台从旧后台入口迁移到统一 React 前端的第一阶段边界。
date: 2026-06-18
updatedAt: 2026-06-18
slug: react-frontend-migration
tags:
  - React
  - i18n
  - Design System
locale: zh-CN
draft: false
cover: /images/blog/react-frontend-migration.svg
author: Console Platform Maintainers
---

第一阶段先建立新的 React 工程骨架，而不是直接删除旧的 Nuxt 后台。这样可以在验证构建产物、Go 静态托管路径和 `/admin` 路由守卫前，保留足够的事实依据。

## 本阶段目标

- 建立 React Router Framework SPA。
- 建立 platform React 组件分层。
- 建立 i18next 资源与 `X-Locale` 映射。
- 建立 Markdown front matter 校验。

后续每迁移一个后台页面，都需要同步清理旧入口、旧组件、旧 API 调用和废弃 i18n key。
