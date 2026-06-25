# internal/ports 目录说明

`internal/ports` 定义跨层最小端口接口，供应用装配、transport、middleware、handler、repository infrastructure 等边缘层共享。

## 职责边界

- 这里放应用边缘需要共享的窄接口，例如数据库事务、运行时状态、生命周期或请求上下文。
- 不把 `ports` 当成宽泛 service 依赖层，也不在这里放具体业务 DTO、领域模型或模块私有接口。
- 模块 service 需要能力时，优先在模块自己的 `service` 包定义本地最小接口，再由 repository/infrastructure 实现。
- `ports` 不依赖 `pkg` 具体实现，也不导入业务模块。

## 扩展规则

- 只有跨多个边缘层且不属于某个模块的契约才进入 `internal/ports`。
- 新增端口时应说明调用方、实现方和生命周期归属。
- 不得把数据库、缓存、消息队列、HTTP client、SMTP client 等具体实现塞进端口类型。

## 验证命令

```powershell
go test ./internal/... -count=1 -mod=readonly
go test ./internal -run TestImportBoundaries -count=1 -mod=readonly
```
