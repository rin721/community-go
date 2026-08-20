# 启动流程

主进程从 `cmd/console` 开始。命令层只声明入口和参数，真实启动、装配和生命周期由 `internal/app` 负责。

## 运行链路

```text
cmd/console
  -> internal/app/cliapp
  -> internal/app/initapp
  -> Core / Infrastructure / Modules / Transport
  -> pkg/httpserver / pkg/rpcserver
```

## 装配顺序

1. 加载配置：`internal/config` 读取默认值、文件和环境变量覆盖。
2. 初始化核心：日志、配置引用、生命周期上下文。
3. 初始化基础设施：数据库、缓存、存储、执行器。
4. 初始化模块：IAM、System。
5. 初始化传输层：HTTP router、可选 JSON-RPC、WebUI 静态托管。
6. 启动生命周期：HTTP/RPC 服务、配置监听、优雅关闭。

基础设施装配采用单一路径：数据库、缓存、执行器或存储中任一后续组件装配失败时，`internal/app/initapp` 会按反向顺序清理已经创建的资源，并把清理失败与原始装配错误一起返回给 CLI 或 server 启动调用方。

CLI 托管模式下，server runtime 会在启动 HTTP/RPC 前初始化 `control.json` watcher，并读取当前进程 PID 与创建时间作为停止信号匹配条件。若当前进程创建时间无法读取，runtime 会关闭已装配资源、写回托管状态并返回错误，避免降级为只按 PID 接受控制请求。

插件运行时已移除；启动链路不再装配插件 host、插件 registry、插件协议 handler 或插件 RPC 方法。

## 关闭链路

`internal/app/lifecycleapp.Shutdown` 会按 HTTP、RPC、后台任务、存储、执行器、缓存、数据库、日志 flush 的顺序释放资源。某个资源关闭失败不会阻断后续资源释放，最终错误会用 `errors.Join` 保留每个底层错误；`Logger.Sync` 的非无害错误也会并入 shutdown 结果。stdout/stderr 在部分平台上的无害 `EINVAL` 由 `pkg/logger` 归一化为 nil，文件或轮转器 flush 失败仍返回给上层。

## 默认命令

```powershell
go run ./cmd/console server --config=configs/config.example.yaml
Copy-Item configs/config.example.yaml configs/config.yaml
go run ./cmd/console server --config=configs/config.yaml
```

CLI 的默认配置路径是 `configs/config.yaml`，该文件属于本地派生配置，不随仓库提交。仓库内可直接运行的示例配置是 `configs/config.example.yaml`，默认服务监听 `127.0.0.1:9999`。
