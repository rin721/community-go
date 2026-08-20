# internal/app/initapp 目录说明

`internal/app/initapp` 是应用装配层的核心目录，负责把配置、核心服务、基础设施、业务模块和传输层组合成可运行的应用图。它不承载具体业务规则，也不直接暴露 HTTP 响应格式。

## 当前职责

- 从 `internal/config.Config` 构造日志、i18n、ID、数据库、缓存、执行器、存储等运行时依赖。
- 装配 `internal/modules` 下的业务模块，并把模块需要的最小端口注入 service。
- 注册 HTTP、RPC 和后台任务等传输与生命周期能力。
- 为系统配置页面提供运行时配置快照与受控更新入口。
- 为首次安装、CLI 和 server runtime 复用同一套应用装配路径。

## 使用规则

- `cmd/console`、`internal/app` 和 CLI bootstrap 可以调用本目录的构造函数。
- 业务模块不得反向导入本目录；模块需要能力时应在自身 service 定义最小接口，由本目录或模块 infrastructure 注入实现。
- `pkg` 不得依赖本目录；基础设施包只提供可复用能力。
- 运行时配置更新必须通过 `config.Manager` 统一入口执行，不能绕过配置校验、持久化策略和 hook 通知。

## 扩展规范

- 新增基础设施能力时，先在 `pkg` 或模块 infrastructure 中实现适配，再在本目录集中装配和关闭。
- 新增业务模块时，应补齐模块 service、repository、handler、route contract、权限、菜单、i18n、测试和模块 README，再接入 `Modules`。
- 新增后台任务时，实现 `BackgroundService`，并确保 `Start`、`Shutdown` 都返回错误；启动失败回滚和正式关闭必须保留底层错误。
- 新增运行时配置项时，同步配置结构、示例配置、系统配置快照、持久化路径、文档和测试。

## 错误与状态规则

- 装配、启动、关闭、配置更新和持久化失败必须向上返回，不允许只写日志后继续报告成功。
- 原始操作失败且清理、关闭或状态落盘也失败时，应使用 `errors.Join` 保留多重错误。
- 只有不影响业务事实的缓存回填、审计后置记录或清理补偿才可以 best-effort，并必须在调用点或架构文档说明影响边界。
- 运行时配置更新闭包可能失败时必须使用 `UpdateWithError`，让配置管理器在验证、持久化和替换前中止。

## 验证命令

```powershell
go test ./internal/app/initapp -count=1 -mod=readonly
go test ./internal/app -count=1 -mod=readonly
git diff --check
```
