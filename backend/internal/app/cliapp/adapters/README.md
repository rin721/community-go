# cliapp adapters 说明

`adapters` 隔离 CLI 运行态对操作系统的直接访问，包括后台进程启动、进程存活判断、PID 元数据读取、端口监听进程探测和托管服务控制文件监听。它属于 CLI / runtime 适配层，不承载业务模块逻辑。

## 职责边界

- `ProcessRunner` 是托管服务状态机使用的进程端口，`managed.Manager` 通过它启动、检测、终止或识别进程。
- `WatchManagedServiceControl` 只负责把 `control.json` 解析为当前托管进程可消费的控制请求，不直接修改业务状态。
- 本目录可以依赖 `pkg/processx` 和标准库 OS 能力，但不得导入 `internal/modules` 或应用业务 service。

## 错误处理

- 后台进程启动、日志文件打开、PID 解析和进程句柄释放失败必须返回给上层，由 `managed.Manager` 写入 failed 状态或返回 CLI 错误。
- 端口监听进程探测发现 PID 后，进程创建时间、可执行文件和命令行读取失败必须返回；这些元数据用于识别非托管 console server，不能以空值继续判断。
- 停止进程时，查找 PID 或执行 kill 失败必须返回；调用方不得在未确认终止的情况下把服务状态清空为 stopped。
- 托管控制 watcher 启动时必须取得当前进程创建时间；无法取得时返回错误给 server runtime，由 runtime 负责关闭已装配资源并写回托管状态。
- 控制文件读取中的“文件不存在”属于轮询过程的正常空态；其他解析失败不应扩散到业务模块，后续若需要可在本目录增加显式运行态诊断。

## 验证命令

修改本目录后至少运行：

```powershell
go test ./internal/app/cliapp/adapters -count=1 -mod=readonly
go test ./internal/app/cliapp/... -count=1 -mod=readonly
```
