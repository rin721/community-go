# API 说明

主系统 HTTP route contract 以 `internal/transport/http/contracts.go` 为单一事实来源。真实路由注册、后台 API catalog、权限同步和 `docs/api/openapi.yaml` 都从这份 contract 派生。

## 文件

| 文件 | 用途 |
| --- | --- |
| `http-api.md` | 面向开发者的中文 HTTP API 说明 |
| `rpc-api.md` | JSON-RPC 独立入口和系统方法说明 |
| `openapi.yaml` | 主系统 HTTP OpenAPI 3.0.3 契约，由 CLI 生成，不手写维护 |

## 事实来源

| 内容 | 来源 |
| --- | --- |
| HTTP route contract | `internal/transport/http/contracts.go` |
| HTTP 路由装配 | `internal/transport/http/router.go` |
| OpenAPI 生成器 | `internal/transport/http/openapi.go` |
| 生成命令 | `go run ./cmd/console api openapi --output docs/api/openapi.yaml` |
| 运行时契约 | `GET /openapi.yaml` |
| IAM API | `internal/modules/iam/handler`、`service`、`model` |
| System API | `internal/modules/system/handler`、`service`、`model` |
| 初始化 DTO | `internal/app/initcenter/dto` |
| 结果与错误 | `types/result`、`types/errors` |

## 新增主系统 API 流程

1. 在模块 handler/service/model 中定义稳定 DTO。
2. 在 `internal/transport/http/contracts.go` 声明 method、Gin path、访问级别、权限、summary、请求/响应类型和参数。
3. 在 `internal/transport/http/router.go` 通过 contract 派生的 route spec 注册真实 handler。
4. 运行 `go run ./cmd/console api openapi --output docs/api/openapi.yaml`。
5. 运行 `go test ./internal/transport/http -count=1 -mod=readonly`。
6. 如语义变化，同步本文档和前端 endpoint registry。
