---
name: aoi-admin-runtime-cli-governance
description: "Repository-specific workflow for CLI, runtime, lifecycle, managed service, startup, shutdown, reload, probes, smoke tests, and process-control changes in this aoi-admin / open console platform repository. Use when changing cmd/console, internal/app/cliapp, lifecycleapp, initapp runtime assembly, managed server state files, health/readiness probes, runtime-smoke scripts, CLI output, or service process orchestration."
---

# Aoi Admin Runtime CLI Governance

使用本 skill 处理 CLI、运行时生命周期、托管 server、探针和本地烟测链路。它补充根 `AGENTS.md` 与 `$aoi-admin-platform-maintenance`，不得把运行态装配逻辑下沉到业务模块或工具库。

## 开始前

1. 阅读 `AGENTS.md`、`docs/runtime/startup-flow.md`、`docs/workflows/db-cli.md`、`docs/workflows/iam-cli.md`、`scripts/README.md` 和相关目录 README。
2. 用 `rg` 查 `cmd/console`、`internal/app/cliapp`、`internal/app/lifecycleapp`、`internal/app/initapp`、`internal/config`、`scripts/runtime-smoke.ps1` 的入口和调用链。
3. 区分运行时装配、CLI 输入输出、业务模块 service、基础设施适配和脚本验证边界；不要把 CLI 状态文件、进程控制或探针逻辑写进业务模块。
4. 如果变更影响配置加载、HTTP 路由、错误响应、发布证据或 WebUI 静态托管，同时使用对应的配置、API、错误契约、发布或 WebUI skill。

## 修改原则

- `cmd/console` 只声明命令和入口参数，具体装配留在 `internal/app`。
- `internal/app` 负责启动、停止、reload、依赖注入和资源关闭；业务模块不直接创建数据库、缓存、logger、HTTP server 或进程控制器。
- CLI handler 只做参数解析、输出适配和错误呈现；运行规则、状态持久化和业务用例留在 service 或应用装配层。
- 托管服务状态文件是 CLI 判断后台 server 状态的事实来源，状态写入失败必须返回调用方；原始操作失败且状态落盘失败时使用 `errors.Join` 保留双重错误。
- 健康检查、ready 探针和 smoke 脚本必须验证当前真实入口与静态托管路径，不得恢复旧入口、插件协议或旧品牌默认值。
- best-effort 清理只能用于不影响业务正确性的临时文件或一次性信号，并在代码或 README 中说明影响边界。

## 常见任务

### 修改 CLI 命令或输出

1. 查命令注册、handler、service 和输出 formatter。
2. 保持可见文案进入 CLI/后端 i18n 资源或受控输出映射，不要散落硬编码。
3. 更新工作流文档、脚本 README 和测试。

### 修改运行时生命周期

1. 查启动、reload、shutdown、后台 goroutine 和资源关闭顺序。
2. 确保启动失败回滚和正式关闭路径都继续释放后续资源，并向上返回聚合错误。
3. 更新 `docs/runtime/startup-flow.md` 或 `docs/architecture/error-result-contracts.md`。

### 修改托管 server 或 smoke

1. 查 `internal/app/cliapp/services/managed` 与 `internal/app/cliapp/services/server`。
2. 固定 `state.json`、`control.json`、PID、进程创建时间和非托管进程识别行为。
3. 变更 smoke 脚本时同步 `scripts/README.md`、发布检查文档和 release gate。

## 验证

按影响范围选择：

```powershell
go test ./internal/app/cliapp/... -count=1 -mod=readonly
go test ./internal/app/... -count=1 -mod=readonly
go test ./internal/config -count=1 -mod=readonly
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

如果环境缺少 Docker、端口被占用或 WebUI 静态产物未构建，最终说明未运行原因、影响范围和本地补证命令。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
