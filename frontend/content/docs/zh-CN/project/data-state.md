---
title: API 与本地状态
description: 说明 useAoiApi、telemetry、共享 DTO、Pinia 和 localStorage hydrate 规则。
order: 50
category: project
navigation:
  icon: database
---

# API 与本地状态

当前应用以 mock API 和浏览器本地状态为主。代码仍要保持面向未来后端的契约意识，避免把临时 UI 结构当作 API 结构扩散。

## API 访问

所有 API 访问统一走 `useAoiApi()`，并保持错误诊断与 `useAoiApiTelemetry()` 兼容。新增 mock 接口时应优先复用 `shared/` 中的 DTO。

## 共享 DTO

面向未来 Go 后端的响应、请求和实体形状应放在共享类型里。页面可以做展示层映射，但不要临时拼接“看起来像后端”的对象。

## 本地状态

Pinia store 在客户端 hydrate 时必须能处理损坏的 `localStorage`，并避免 SSR 崩溃。文件上传草稿只能持久化文件元数据，不能保存文件字节。

## 错误与诊断

错误状态应暴露给页面和设置诊断区，而不是只在 console 中丢失。用户可见错误文案需要进入三份 locale 文件。
