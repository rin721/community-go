# init 服务说明

`init` 负责 CLI 首次初始化命令对统一初始化中心的适配。它会装配最小应用图来复用真实配置、数据库、IAM、System 和 setup schema 逻辑，但不会启动 HTTP/RPC 监听。

## 职责边界

- `InspectInitializationStatus` 只读取初始化状态，不触发 IAM 迁移或完整模块装配。
- `SetupSchema` 和 `SaveSetupConfig` 复用 `initcenter` 的 schema、配置测试和配置保存逻辑。
- `ExecuteInitialization` 执行数据库迁移、IAM 初始化、System 默认数据和首次 owner 创建。
- `OfferManagedServerRestartAfterInit` 只负责初始化成功后的托管 server 启动/重启提示，不重新实现初始化或进程管理规则。
- 本目录只做 CLI service 层适配，不承载业务规则；业务规则继续留在 `internal/app/initcenter`、IAM/System 模块或应用装配层。

## 错误处理

- 初始化主流程错误必须原样返回给 handler。
- `InspectInitializationStatus`、`SetupSchema` 和 `SaveSetupConfig` 这类轻量 bootstrap center 调用结束后，如果数据库关闭失败，也必须返回给 CLI 调用方。
- `run server` 启动前调用 `InspectInitializationStatus` 失败时，handler 必须返回该错误；无法确认初始化状态时不得继续按“不需要初始化”启动。
- 初始化成功后检查托管 server 状态失败必须返回给 CLI 调用方；非交互提示、跳过提示和后续命令提示写入 stdout 失败也必须返回。
- 初始化结束后的资源关闭失败必须返回给调用方；如果主流程和关闭都失败，使用 `errors.Join` 同时保留两类错误。
- bootstrap 基础设施装配中途失败时，已经创建的数据库、缓存、执行器或存储资源必须清理，并把清理失败合并到原始装配错误中。

## 验证命令

修改本目录后至少运行：

```powershell
go test ./internal/app/cliapp/services/init -count=1 -mod=readonly
go test ./internal/app/cliapp/... -count=1 -mod=readonly
```
