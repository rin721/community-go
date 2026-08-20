# pkg 目录说明

`pkg` 是可复用基础能力层，不能依赖 `internal/app` 或 `internal/modules`。

## 包职责

- 基础设施：`database`、`cache`、`storage`、`httpserver`、`rpcserver`、`migrator`。
- 通用能力：`logger`、`i18n`、`mail`、`token`、`crypto`、`mfa`、`authorization`。
- 工程工具：`cli`、`configloader`、`executor`、`processx`、`sqlgen`、`yaml2go`、`utils`、`web`。

## 开发规则

- `pkg` 不承载业务逻辑，也不感知 IAM、system 或任何产品模块。
- 工具库不得吞掉错误；底层必须返回错误、结果和状态，由上层决定重试、降级、日志或响应。
- 新增包必须有明确复用边界，避免把单个模块私有逻辑提前抽到 `pkg`。
- 包内 README 应说明使用方式、扩展点、错误处理和测试命令。

## 验证命令

```powershell
go test ./pkg/... -count=1 -mod=readonly
go vet ./...
```
