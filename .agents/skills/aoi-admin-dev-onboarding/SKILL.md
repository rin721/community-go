---
name: aoi-admin-dev-onboarding
description: "Repository-specific workflow for new developer onboarding, local environment checks, first-run setup, demo data, README guidance, and smoke verification in this aoi-admin / open console platform repository. Use when preparing or auditing local setup docs, helping a developer run the project, validating setup wizard flows, demo environment docs, seed data, or onboarding smoke evidence."
---

# Aoi Admin Dev Onboarding

使用本 skill 维护当前仓库的新开发者入门、本地运行、首次安装向导和演示数据闭环。目标是让开发者能按文档从干净环境理解、启动、验证并继续开发。

## 开始前

1. 阅读 `README.md`、`AGENTS.md`、`docs/README.md`、`docs/onboarding/demo-environment.md`、`docs/testing/onboarding-smoke-2026-06-23.md` 和 `scripts/README.md`。
2. 用 `git status --branch --short` 确认工作树，不修改或提交 `configs/config.yaml`、`configs/config.local.yaml`、`.env`、`data/`、`tmp/`、构建产物或本地运行数据。
3. 区分“开发者文档入口”“真实启动链路”“示例数据/迁移”“本机环境缺工具”四类问题；不要把环境缺失写成项目能力缺失。

## 入门链路

按最小可复现顺序验证：

1. 本机工具：Go、Node、pnpm/corepack、Python、Git、可选 Docker/Bash/GitHub CLI。
2. 配置：优先使用 `configs/config.example.yaml` 和文档化环境变量；本地派生配置不作为交付事实。
3. 后端：`cmd/console`、配置加载、数据库迁移、`/health`、`/ready`、`/openapi.yaml`。
4. 前端：`web/app` 依赖、i18n、typecheck、dev server 或构建产物。
5. 首次安装：`/setup` status/schema/run 流程与后端 setup API 一致。
6. 演示数据：只使用已文档化迁移、seed 或 demo 流程；不要手工往 `data/` 写入要提交的状态。

## 常用验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
go test ./internal/config ./internal/transport/http -count=1 -mod=readonly
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
git diff --check
```

如果目标是“从零启动”，优先给出实际 URL、使用的配置、临时目录和停止方式；如果工具缺失，记录缺失工具、影响范围和开发者本地补证命令。

## 文档同步

- 入口命令、端口、依赖、配置示例或 smoke 路线变化时，同步 `README.md`、`docs/README.md`、`docs/onboarding/demo-environment.md`、`docs/testing/test-matrix.md` 和 `scripts/README.md`。
- setup schema、初始化字段或演示数据变化时，同步后端 contract、前端 i18n、模块文档和 onboarding smoke 记录。
- 已知无法在当前机器补证的 Docker、Bash 或目标环境事项写入 `docs/backlog/known-gaps.md`，不要写成已完成。
