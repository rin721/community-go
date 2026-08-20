# internal/app 目录说明

`internal/app` 是后端应用装配层，负责把配置、基础设施、业务模块和传输层组装成可运行进程。

## 主要子包

- `cliapp`：CLI 命令、交互、配置预检和托管服务控制。
- `initapp`：应用启动装配根，创建基础设施、业务模块、HTTP/RPC server 和初始化状态。
- `initcenter`：首次安装向导后端能力，暴露 setup schema、status、step 保存和测试能力。
- `lifecycleapp`：统一启动、停止和资源关闭。
- `mainapp`：运行模式选择。
- `reloadapp`：配置重载和运行态替换。
- `adapters`：把 `pkg` 基础能力适配成业务模块需要的端口。

## 装配规则

- `cmd/console` 必须保持轻薄，只创建 CLI app 并执行。
- 基础设施生命周期由 `internal/app` 统一管理，不在 service 中临时创建。
- 新模块应在 `initapp/modules.go` 中显式装配，并在 `initapp/transport.go` 中注册传输入口。
- 可变品牌、认证、Cookie、CSRF、存储、日志和部署策略必须来自配置，不写入 handler 或 service。
- 启动失败回滚必须把已启动组件的关闭错误返回给调用方；正式关闭路径必须继续尝试释放后续资源并汇总错误。

## 验证命令

```powershell
go test ./internal/app/... -count=1 -mod=readonly
go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
```
