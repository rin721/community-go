---
title: 仓库边界
description: 说明 app、shared、server/api/mock、i18n 和 design 等目录的职责。
order: 20
category: project
navigation:
  icon: folder-tree
---

# 仓库边界

仓库按前端应用、共享契约、mock 服务和长期设计文档分层。新增代码应先落到最贴近职责的目录。

## 应用代码

`app/` 是 Nuxt 前端应用主体，包含页面、组件、composable、store、插件、样式和本地类型。业务页面优先使用 Nuxt 自动导入和本地 composable，避免引入不必要的全局工具。

`app/components/aoi/` 是 Material Web 与 Aoi 设计系统的边界。业务组件和页面不要直接使用 `md-*` 元素；需要新的 Material 行为时，先扩展 Aoi wrapper。

## 共享契约

`shared/` 放置 app 和 mock server 需要共同使用的 DTO、fixture 与契约类型。已有共享契约时，不要在页面里临时拼接响应结构。

## Mock API

`server/api/mock/` 只服务当前前端原型，接口形状尽量贴近未来真实 API。不要把它扩展成生产后端，也不要把持久化或权限逻辑藏进 mock 层。

## 本地化与设计

`i18n/locales/` 维护 `zh-CN`、`en`、`ja` 三份用户可见文案。新增共享文案时三份同步。

聚合仓库根目录 `AGENTS.md` 保存长期规则，`frontend/` 相关约束只在开发前端时生效。短期实验、计划草案和调研结果应留在任务上下文或临时位置，避免重新制造分散规则入口。

## 生成目录

不要编辑 `.nuxt/`、`.output/`、`node_modules/` 等生成目录或依赖目录。依赖变化只通过 pnpm 有意产生，并保留对应 lockfile 更新。
