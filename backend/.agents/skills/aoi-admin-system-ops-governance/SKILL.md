---
name: aoi-admin-system-ops-governance
description: "Repository-specific workflow for system administration and operations capabilities in this aoi-admin / open console platform repository. Use when changing system configuration pages, parameters, dictionaries, operation records, media library, resumable uploads, version packages, traffic probes, notification outbox operations, system permissions, or related docs/tests."
---

# Aoi Admin System Ops Governance

使用本 skill 处理 System 与后台运营能力：系统配置、参数、字典、操作记录、媒体库、断点上传、版本包、流量探针和通知投递队列运维入口。目标是让后台能力围绕 route contract、权限、审计、错误返回和可观测证据形成闭环。

## 开始前

1. 阅读 `AGENTS.md`、`docs/modules/system.md`、`docs/modules/iam.md`、`docs/modules/permission-matrix.md`、`docs/architecture/error-result-contracts.md` 和相关 React 后台路由。
2. 用 `rg` 查目标能力的后端 route contract、handler、service、repository、migration、seed、权限码、菜单项、WebUI endpoint 和 i18n key。
3. 区分 System 模块能力、IAM 通知队列能力、运行探针能力和发布证据；不要把相邻模块职责合并到工具库或前端本地状态。

## 边界规则

- 主系统 API、权限、OpenAPI 和 system API catalog 以 `internal/transport/http/contracts.go` 为事实来源。
- System 写操作必须有后端权限校验、route contract 权限、必要的操作审计和前端禁用态；前端禁用只做体验辅助。
- 参数、字典、菜单、权限和系统配置属于平台级共享能力；业务模块私有类型和规则不得塞进全局 `types` 或 System 工具函数。
- 媒体、版本包、流量探针和通知队列不得吞掉底层错误；可补偿清理可以记录 warn，但主状态、重试状态和调度错误必须能向上返回或被发布观察捕获。
- 通知队列和媒体下载不得暴露一次性 token、完整链接、token hash、Cookie、密钥或未脱敏个人信息。
- WebUI 可见文案维护在 `web/app/app/i18n/locales/{zh-CN,en-US}.json`；后端/CLI/API 文案维护在 `configs/locales` 对应命名空间。

## 常见任务

### 系统配置、参数或字典

1. 查配置结构、系统参数快照、后端 i18n 标签、迁移或 seed。
2. 更新 route contract、service 校验、repository 持久化和 WebUI 表单。
3. 补权限矩阵、模块文档和前端加载/空/错误状态。

### 操作记录、审计和通知队列

1. 确认主数据事务、审计写入和通知 outbox 状态顺序。
2. 失败时保留可重试状态并返回明确错误；日志不能替代 API 错误。
3. WebUI 只展示脱敏视图，手动重试按钮按 `notification:retry` 禁用。

### 媒体、断点上传、版本包和探针

1. 确认上传、导入、下载、删除、过期清理和后台补偿任务边界。
2. 更新对象存储、本地存储、数据库记录和调度器错误处理。
3. 补 release observation 或 known gaps，明确哪些需要目标环境继续观察。

## 验证

按影响范围选择：

```powershell
go test ./internal/modules/system/... -count=1 -mod=readonly
go test ./internal/modules/iam/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

涉及可见后台页面时追加 `$aoi-admin-visual-qa-governance`。涉及发布证据、Docker 或目标环境观察时追加 `$aoi-admin-release-readiness` 与 `$aoi-admin-observability-ops`。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
