---
title: API 与本地状态
description: 说明 useAoiApi、telemetry、共享 DTO、Pinia 和 localStorage hydrate 规则。
order: 50
category: project
navigation:
  icon: database
---

# API 与本地状态

当前应用通过 `useAoiApi()` 连接后端社区公开 API；mock API 和浏览器本地状态只作为开发、离线体验和降级边界。代码应以共享 DTO 和后端 route contract 为准，避免把临时 UI 结构当作 API 结构扩散。

## API 访问

所有 API 访问统一走 `useAoiApi()`，并保持错误诊断与 `useAoiApiTelemetry()` 兼容。`NUXT_PUBLIC_API_MOCK=false` 时消费 `backend/internal/modules/community` 返回的 `result` envelope；新增 mock 接口时应优先复用 `shared/` 中的 DTO。

## 共享 DTO

后端响应、请求和实体形状应放在共享类型里，并贴近 `backend/internal/transport/http/contracts.go` 暴露的契约。页面可以做展示层映射，但不要临时拼接“看起来像后端”的对象。

## 本地状态

Pinia store 在客户端 hydrate 时必须能处理损坏的 `localStorage`，并避免 SSR 崩溃。文件上传草稿只能持久化文件元数据，不能保存文件字节。

## 错误与诊断

错误状态应暴露给页面和设置诊断区，而不是只在 console 中丢失。用户可见错误文案需要进入三份 locale 文件。
