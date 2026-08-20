# cliapp output 说明

`output` 负责 CLI handler 和 service 共享的输出格式化，包括依赖服务摘要、数据库操作结果、托管服务状态和日志查看。它只做展示格式适配，不读取业务状态，也不决定业务成功或失败。

## 职责边界

- handler 负责调用 service 并决定何时输出；本目录只把已得到的数据写入 `io.Writer`。
- 配置相关输出通过 `internal/app/cliapp/config` 读取真实配置，不维护独立默认值。
- 托管服务状态输出只展示 `managed.ServiceState`，不直接读写 `state.json` 或控制文件。

## 错误处理

- 函数签名返回 `error` 的 formatter 必须返回写入失败，避免脚本调用方误判输出已可靠写入。
- `WriteDBOperationResult` 属于 `db` 命令结果输出，写入失败必须返回给 handler。
- `PrintServiceState` 属于托管服务运行态结果输出，写入失败必须返回给 handler。
- `PrintServiceLogs` 会把普通日志文件缺失或读取失败显示为日志内容，便于用户判断服务尚未产生日志；但历史日志、跟随提示和新增日志行写入 stdout 失败必须返回给 handler。

## 验证命令

修改本目录后至少运行：

```powershell
go test ./internal/app/cliapp/output -count=1 -mod=readonly
go test ./internal/app/cliapp/... -count=1 -mod=readonly
```
