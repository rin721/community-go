# 新人接手指南

第一目标不是读完所有代码，而是先跑起来，再沿最小链路理解启动、路由、service、repository 和 app 装配。

## 先记住这张地图

| 层 | 路径 | 第一眼怎么理解 |
| --- | --- | --- |
| 进程入口 | `cmd/console` | 声明命令、解析参数、启动服务或执行 CLI 任务 |
| 装配根 | `internal/app` | 创建基础设施、装配模块、管理生命周期 |
| 业务模块 | `internal/modules` | `service` 写业务 contract，`repository/infrastructure` 实现技术细节 |
| 传输层 | `internal/transport`、`internal/middleware` | 注册路由、中间件、认证、权限和响应转换 |
| 基础设施 | `pkg` | 数据库、日志、HTTP/RPC server、缓存、迁移、token、RBAC、TOTP 等实现 |

## 第一遍阅读路线

1. `docs/README.md`
2. `docs/architecture/layers.md`
3. `cmd/console/main.go`
4. `internal/app/initapp/modules.go`
5. `internal/transport/http/router.go`
6. `internal/transport/http/contracts.go`
7. `internal/modules/iam/service/service.go`
8. `internal/modules/system/service/service.go`

## 本地跑起来

仓库不跟踪 `configs/config.yaml`，第一次运行可以直接使用示例配置，或先复制一份作为本地私有配置：

```powershell
go run ./cmd/console server --config=configs/config.example.yaml
curl http://127.0.0.1:9999/health
curl http://127.0.0.1:9999/ready
```

打开 `http://127.0.0.1:9999/admin`。如果还没有用户，使用 `/setup` 完成初始化，或通过 CLI 创建管理员：

```powershell
Copy-Item configs/config.example.yaml configs/config.yaml
"change-this-local-password" | go run ./cmd/console iam bootstrap-admin --config=configs/config.yaml --org-code=acme --org-name="Acme Corp" --username=admin --email=admin@example.com --password-stdin
```

## 新功能应该改哪里

| 任务 | 优先看哪里 |
| --- | --- |
| 新增 HTTP API | `internal/transport/http/contracts.go`、模块 `handler` |
| 修改业务规则 | 模块 `service` |
| 修改数据库读写 | 模块 `repository` |
| 接入外部系统 | 模块 `infrastructure` 或应用装配层 adapter |
| 新增表结构 | `internal/migrations` |
| 修改配置字段 | `internal/config`、示例配置、配置文档 |
| 修改通用基础能力 | `pkg`，并确认不依赖 `internal` |

## 常用验证

```powershell
go test ./... -count=1 -mod=readonly
go vet ./...
go build -mod=readonly -o ./tmp/console-server ./cmd/console
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
```
