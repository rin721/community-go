---
title: Aoi 文档
description: 项目系统、协作规则和 Aoi wrapper 组件库的公开静态文档入口。
order: 1
category: docs
navigation:
  icon: book-open
---

# Aoi 文档

这里是 `aoi-web` 的长期文档入口。内容分为两组：项目系统文档解释 Nuxt 应用、仓库边界、状态、API、i18n 和验证流程；组件库文档覆盖 `app/components/aoi/` 下的全部 Aoi wrapper。

## 快速入口

- [项目概览](/docs/project/overview) 说明应用目标、技术栈和当前社区 API / mock 边界。
- [仓库边界](/docs/project/repository) 说明哪些目录可以承载长期代码，哪些目录属于生成产物。
- [组件总览](/docs/components/overview) 说明 Aoi wrapper 的使用原则和分类。
- [Actions 组件](/docs/components/actions) 展示按钮、链接和命令型导航。
- [Forms 组件](/docs/components/forms) 展示输入、选择、上传和编辑器。

## 文档约定

所有语言版本保持相同 slug。默认语言是 `zh-CN`，项目的 i18n 策略是 `no_prefix`，所以切换语言时路径保持不变，页面内容随当前 locale 查询对应 Markdown collection。

::docs-callout{title="静态优先" intent="info" icon="sparkles"}
`/docs` 使用 Nuxt Content 渲染 Markdown，并通过 route rules 预渲染为静态页面。它不新增 mock API，也不改变后端社区生产契约边界。
::

## 编写方式

Markdown 负责解释、示例和跨页链接。组件 API、事件、插槽和 demo 入口来自结构化元数据，避免同一张表在多种语言里重复维护。
