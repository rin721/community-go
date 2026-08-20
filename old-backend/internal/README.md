# internal 目录说明

`internal` 承载当前后端应用层代码，只供本仓库内部使用。它不是可复用 SDK，也不应被外部项目导入。

## 分层边界

- `app`：应用生命周期、配置加载、依赖装配、启动/停止/重载。
- `config`：配置结构、默认值、环境变量覆盖、校验、持久化和诊断。
- `modules`：业务模块，目前包含 `iam` 和 `system`。未来业务能力统一通过新增模块扩展。
- `middleware`：HTTP 传输中间件，例如认证、i18n、日志、恢复、限流和 trace。
- `ports`：跨层最小端口接口，供 app、transport、middleware、handler、repository infrastructure 使用。
- `transport`：HTTP/RPC 传输层装配和契约生成。
- `migrations`：数据库迁移，已共享的迁移视为 append-only。

## 开发规则

- 业务规则放在模块 `service`，handler 只做协议适配。
- 模块 service 通过本包最小接口接收能力，不直接初始化数据库、缓存、日志、HTTP client 或外部服务。
- repository / infrastructure 可以依赖具体基础设施，但必须隔离 ORM、SQL、缓存、存储和外部协议细节。
- 不得恢复 `internal/plugin` 或以插件系统扩展业务；新增能力应进入 `internal/modules/<module>` 并由 `internal/app` 装配。

## 验证命令

```powershell
go test ./internal/... -count=1 -mod=readonly
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ai/check-architecture.ps1
```
