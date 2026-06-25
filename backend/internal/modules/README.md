# internal/modules 目录说明

`internal/modules` 是后端业务模块层。当前模块包括：

- `iam`：账号、认证、会话、组织、角色、权限、API Token、审计登录相关能力。
- `system`：菜单、系统配置、字典、媒体、版本、API catalog、操作记录、探针、错误日志和运行态观测能力。
- `announcements`：公告业务示例模块，覆盖列表、创建、编辑、发布、归档、删除、公开只读读取、权限、OpenAPI、React 后台页面和公开页面。

## 模块结构

推荐保持以下包结构：

- `model`：领域数据结构、持久化模型、领域常量。
- `service`：应用服务、用例编排、权限语义、事务边界和模块本地接口。
- `handler`：HTTP/RPC/CLI 输入输出适配，不承载业务规则。
- `repository`：持久化实现，满足 service 定义的接口。
- `infrastructure`：模块私有基础设施适配，例如通知、外部协议或特定技术实现。

## 新增模块规范

- 未来业务扩展统一新增模块，不使用插件系统。
- service 定义自己需要的最小接口，不导入同模块 repository 实现。
- handler 使用稳定 DTO，不用匿名结构或散落 `map[string]any` 表达普通业务 API。
- 主系统 HTTP API 必须进入 `internal/transport/http/contracts.go`，再生成 `docs/api/openapi.yaml`。
- 模块私有类型留在模块内部；只有平台生命周期、跨层上下文和全局契约可进入根 `types`。
- 非 IAM 模块需要读取当前认证主体或构造权限判断上下文时，使用 `types/auth`，不要直接导入 IAM 模块内部 service。
- 新模块必须显式接入 `internal/app/initapp/layers.go`、`internal/app/initapp/modules.go`、`internal/app/initapp/transport.go`、`internal/transport/http/contracts.go` 和 `internal/transport/http/router.go`。
- 具体步骤见 `docs/extension/module-blueprint.md`；不要通过动态扫描或隐藏注册表恢复插件式扩展。

## 验证命令

```powershell
go test ./internal/modules/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
```
