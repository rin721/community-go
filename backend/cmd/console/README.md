# cmd/console 入口说明

`cmd/console` 是当前项目的唯一 Go 进程入口，用于构建后台管理 / 控制台平台服务二进制。实际命令注册、配置加载、生命周期、模块装配和 HTTP/RPC 启动逻辑位于 `internal/app/cliapp` 与 `internal/app`。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `main.go` | 调用 `cliapp.Run`，传入命令行参数、标准输入输出和错误输出，并按统一退出码结束进程。 |
| `openapi_contract_test.go` | 校验运行时生成的 OpenAPI YAML 可解析，并包含主系统关键路由。 |

## 扩展方式

- 新增 CLI 命令时，在 `internal/app/cliapp/commands` 中注册命令规格，不要在 `main.go` 中分支处理。
- 新增 HTTP API 时，先更新 `internal/transport/http/contracts.go`，再通过 `go run ./cmd/console api openapi --output docs/api/openapi.yaml` 生成契约。
- 新增应用启动能力时，通过 `internal/app` 装配基础设施和模块，不要在入口层直接创建依赖。

## 常见错误

- 不要在入口层读取业务环境变量或拼接配置默认值。
- 不要把测试只写在 `cmd/console`，业务行为应靠近对应 `internal` 或 `pkg` 包。
- 不要恢复旧入口、旧命令名或旧发布二进制名。

## 验证命令

```powershell
go run ./cmd/console --help
go test ./cmd/console -count=1 -mod=readonly
go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
```
