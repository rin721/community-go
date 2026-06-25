---
title: 验证与协作
description: 说明 pnpm 命令、验证边界、Git 协作和脏工作区保护。
order: 70
category: project
navigation:
  icon: check-circle
---

# 验证与协作

仓库只使用 pnpm。当前声明版本是 `pnpm@10.22.0`，常用命令来自项目根目录。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm preview
```

仓库当前没有提交 `lint` 脚本。除非后续新增或任务明确提供 lint 命令，不要声称已经完成 lint 验证。

## 何时验证

修改 TypeScript、Vue、路由、composable 或 store 后运行 `pnpm typecheck`。修改 Nuxt 配置、server route、runtime config 或构建敏感模块后运行 `pnpm build`。

可见 UI 变更应尽量在浏览器中检查桌面和移动端表现，尤其是文本换行、焦点状态、抽屉、浮层和小屏布局。

## Git 协作

编辑前先检查工作区状态。不要回滚用户改动或无关脏文件。除非用户明确要求，不要提交、创建分支或推送。
