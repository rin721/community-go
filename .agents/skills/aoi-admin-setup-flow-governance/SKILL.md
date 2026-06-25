---
name: aoi-admin-setup-flow-governance
description: "Repository-specific workflow for first-run setup, unified initialization center, setup status/schema/run APIs, CLI init reuse, setup token handling, setup i18n, and onboarding verification in this aoi-admin / open console platform repository. Use when changing /setup routes, internal/app/initcenter, setup contracts, setup config fields, setup docs, or first-run smoke evidence."
---

# Aoi Admin Setup Flow Governance

使用本 skill 处理当前仓库的首次安装、统一初始化中心、Web setup、CLI init 和本地 onboarding smoke。目标是让浏览器向导、CLI 初始化、配置保存、迁移、账号创建和运行状态读取复用同一条真实链路。

## 开始前

1. 阅读 `AGENTS.md`、`docs/modules/iam.md`、`docs/onboarding/demo-environment.md`、`docs/workflows/iam-cli.md`、`internal/app/initcenter/README.md` 和 `web/app/app/routes/setup` 相关代码。
2. 用 `rg` 查 `initcenter`、`/api/v1/setup`、`/api/v1/auth/setup`、`SetupSchema`、`setupToken`、`bootstrap_state`、`console init` 和 `/setup` 的当前引用。
3. 区分统一 setup 主链路、兼容 auth setup API、CLI init 适配、WebUI 本地确认字段和演示环境说明；不要把 UI-only 字段写入后端 payload 或文档成生产能力。

## 边界规则

- `internal/app/initcenter` 是首次初始化编排事实来源；Web handler、CLI init 和受管服务启动提示都应复用它。
- Setup schema、状态、运行记录、步骤日志、测试能力和字段可见性必须来自后端；React 向导不得凭空扩展后端未暴露的生产字段。
- 允许前端保留不提交后端的 UI-only 本地确认字段，例如确认密码；不得写入 API payload、URL、日志、截图、localStorage 或 sessionStorage。
- Setup token 只能用于初始化完成后的受控读取、重试和日志摘要；不得在普通日志、发布证据或前端持久化中暴露。
- 保存配置、测试配置、清理 bootstrap 状态和输出初始化摘要时，错误必须返回上一层；不得用 warn 日志伪装成功。
- 可见文案同步 `configs/locales/{ui,api,validation,system}/{zh-CN,en-US}.yaml` 与 `web/app/app/i18n/locales/{zh-CN,en-US}.json`。

## 修改流程

1. 先确认 setup 变更触达范围：schema、配置结构、API contract、CLI、WebUI、i18n、迁移、seed、文档或 smoke。
2. 后端变更优先更新 `internal/app/initcenter`，再更新 handler、CLI adapter、route contract 和测试。
3. 配置字段变更同步 `internal/config`、示例配置、系统配置快照、setup schema、后端 i18n 和文档。
4. WebUI 变更通过 `web/app/app/lib/api` 调用 setup endpoints，并用 TanStack Query/React state 表达加载、错误、重试和完成态。
5. 更新 `docs/modules/iam.md`、`docs/onboarding/demo-environment.md`、`docs/testing/test-matrix.md` 或对应维护审计，说明真实初始化入口和验证命令。

## 验证

按影响范围选择：

```powershell
go test ./internal/app/initcenter -count=1 -mod=readonly
go test ./internal/app/cliapp/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

涉及可见 setup 页面时追加 Playwright 或 Browser 视觉检查，至少覆盖桌面和窄屏。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
