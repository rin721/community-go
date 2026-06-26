# internal/transport 目录说明

`internal/transport` 承载后端传输层，目前包含 HTTP 和 RPC。

## HTTP

- `http/router.go` 负责 Gin 路由装配、SPA fallback 和中间件串联。
- `http/contracts.go` 是主系统 API 的单一事实来源，声明 method、path、访问级别、权限、summary、请求/响应 DTO 和参数。
- `http/openapi.go` 从 route contract 生成 OpenAPI。
- `docs/api/openapi.yaml` 是生成产物，不手写维护。

## RPC

RPC 仅保留平台内部服务能力注册。测试会确认 RPC 方法集与当前平台边界一致。

## 变更规则

- 新增主系统 API 时，先改 route contract，再注册实际 handler。
- 不得按路径前缀、method 字符串或目录推断权限；权限和 API catalog 只能从 contract 派生。
- `GET /openapi.yaml` 是公开运行时契约接口，不纳入 `/api/v1` catalog 或权限同步。
- 公开社区、系统和后台 API 路径以 route contract 和真实 handler 为准；扩展能力走模块化 HTTP contract。

## 验证命令

```powershell
go run ./cmd/console api openapi --output docs/api/openapi.yaml
go test ./internal/transport/... -count=1 -mod=readonly
```
