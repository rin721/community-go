# 后端分层边界审计：2026-06-23

本文记录第四阶段“后端架构分层与核心基础能力”的本轮审计和修复。结论以当前代码、包导入、边界测试和命令输出为准。

## 审计范围

- `internal/import_boundary_test.go`
- `types/import_boundary_test.go`
- `internal/middleware/auth.go`
- `internal/transport/http/router.go`
- `internal/transport/http/contracts.go`
- `internal/modules/iam/service`
- `internal/modules/system/handler`
- `internal/modules/announcements/handler`
- `types`

## 真实状态

已有边界测试能够约束以下规则：

- `internal` 生产代码不能直接导入第三方基础设施包。
- `internal` 中除 app/config 外不能直接依赖 `pkg` 实现。
- 模块 service 不能导入同模块 repository 实现，也不能导入共享基础设施端口。
- 插件运行时目录不得重新出现。
- `types` 不能导入 `internal` 或 `pkg`。

本轮扫描发现生产代码中未出现模块、传输层或中间件直接导入 `pkg/*` 的问题，但存在一个跨模块类型边界漂移：

- IAM service 内定义的 `Principal` 和 `PermissionContext` 被 `internal/middleware`、`internal/transport/http`、System handler 和 Announcements handler 直接使用。
- 这两个类型实际表达的是平台级请求主体和权限判断上下文，不是 IAM 模块私有业务类型。
- 如果继续让非 IAM 模块依赖 IAM service，未来新增模块会复制该耦合，削弱模块边界。

## 修复决策

- 新增 `types/auth`，把跨层认证主体和权限判断上下文收敛为平台契约。
- IAM service 保留 `Principal` 和 `PermissionContext` 类型别名，避免扩大 IAM 内部接口改动面。
- 中间件、路由权限装配、System handler、Announcements handler 改为依赖 `types/auth`。
- OpenAPI route contract 中邀请接受响应改为引用 `types/auth.Principal`，避免契约层依赖 IAM service 只为取平台主体类型。
- 补充边界测试，禁止中间件直接导入模块 service，禁止非 IAM 模块导入 IAM 内部包。

## 修改文件

- `types/auth/doc.go`
- `types/auth/context.go`
- `types/auth/README.md`
- `types/README.md`
- `internal/modules/iam/service/service.go`
- `internal/middleware/auth.go`
- `internal/middleware/auth_test.go`
- `internal/modules/system/handler/handler.go`
- `internal/modules/announcements/handler/handler.go`
- `internal/transport/http/router.go`
- `internal/transport/http/contracts.go`
- `internal/import_boundary_test.go`
- `docs/architecture/layers.md`
- `internal/modules/README.md`
- `internal/middleware/README.md`

## 验证命令

```powershell
gofmt -w types\auth\doc.go types\auth\context.go internal\modules\iam\service\service.go internal\middleware\auth.go internal\middleware\auth_test.go internal\modules\system\handler\handler.go internal\modules\announcements\handler\handler.go internal\transport\http\router.go internal\transport\http\contracts.go internal\import_boundary_test.go
go test ./internal ./internal/middleware ./internal/transport/http ./internal/modules/announcements/... ./internal/modules/system/... ./internal/modules/iam/... ./types/... -count=1 -mod=readonly
rg -n "github\.com/open-console/console-platform/internal/modules/iam/service" internal\middleware internal\modules\system internal\modules\announcements --glob "*.go" --glob "!**/*_test.go"
rg -n "iamservice\.(Principal|PermissionContext)" internal\middleware internal\modules\system internal\modules\announcements internal\transport --glob "*.go" --glob "!**/*_test.go"
rg -n "github\.com/open-console/console-platform/pkg/" internal\modules internal\middleware internal\transport --glob "*.go" --glob "!**/*_test.go"
go list -mod=readonly ./...
git diff --check
```

期望结果：

- Go 测试通过。
- 两条生产代码依赖扫描无输出。
- `go list` 通过。
- `git diff --check` 通过，若仅出现既有 CRLF/LF 警告，应在阶段总结中记录。

## 后续规则

- 新增跨模块认证或授权上下文字段时，先判断是否确属平台契约；只有跨传输层、应用层和多个模块共享时才进入 `types/auth`。
- 非 IAM 模块不得通过导入 IAM service 获取主体、会话、角色或权限类型。
- IAM 领域模型、登录流程、组织、角色、权限、会话和审计类型仍保留在 IAM 模块内部。
- 中间件只依赖 `internal/ports`、`types/*` 和通用结果/错误契约，不直接依赖业务模块 service。
