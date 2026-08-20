# managed 服务说明

`managed` 负责 CLI 后台托管服务的状态文件、控制文件、进程启动、停止、重启和非托管进程识别。它只服务命令行运行态，不承载业务模块逻辑。

## 职责边界

- `Manager` 统一读写 `data/cli-runtime/<service>/state.json` 和 `control.json`。
- `StartServer` 负责配置预检、可执行文件准备、后台进程启动和运行态状态落盘。
- `Status` 负责读取状态文件，并根据 PID 与进程创建时间刷新已退出进程。
- `StopServer` 和 `RestartServer` 负责写入停止信号、等待进程退出、必要时强制结束。

## 错误处理

- 状态文件写入失败必须返回给调用方，不得只更新内存中的 `ServiceState`；旧 `state.json` 删除失败、临时文件替换失败和替换失败后的临时文件清理失败都必须保留错误上下文。
- 当原始操作失败且 failed/stopped 状态也写入失败时，必须同时保留原始错误和状态持久化错误。
- 后台托管可执行文件准备失败必须返回真实原因；`os.Executable()` 解析失败、临时文件复制失败、复制失败后的 close 错误、旧目标二进制删除失败和失败路径临时文件清理失败都不能被替换成笼统提示。
- 后台进程启动后的 PID 存活检查失败必须写入 failed 状态并返回检查错误，不得把检查失败误写成“进程已退出”。
- `Status` 检测非托管 server 监听进程时，端口探测和 PID 元数据读取失败必须返回给 CLI 调用方；不能把无法确认的监听事实静默降级为 stopped。
- `control.json` 是一次性控制信号。启动前如果无法删除陈旧控制文件，必须写入 failed 状态并阻止启动；停止完成后如果无法删除控制文件，必须把删除错误返回给 CLI 调用方。
- 强制停止托管或非托管进程时，OS 进程查找或 kill 失败必须返回给 CLI 调用方；不得在未确认进程终止时把状态写成 `stopped`。

## 扩展规范

- 新增托管服务时必须先补充 `ServiceState` 字段、状态读写测试和 CLI 输出映射。
- 不要在业务 service 中直接操作托管状态文件；由 CLI service 层统一管理。
- 修改启动、停止或重启流程后，至少运行：

```powershell
go test ./internal/app/cliapp/services/managed -count=1 -mod=readonly
go test ./internal/app/cliapp/... -count=1 -mod=readonly
```
