# architecture 目录说明

`architecture` 存放平台架构边界、分层依赖和错误/结果契约说明。这里记录长期有效的工程约束，不放一次性审计记录。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `layers.md` | 说明 `cmd`、`internal/app`、`internal/modules`、`internal/ports`、`pkg`、`types`、`web/app` 等目录的职责边界。 |
| `error-result-contracts.md` | 说明后端 API 响应、错误返回、工具库错误传播、前端请求错误处理和后台补偿任务的结果契约。 |

## 维护规则

- 架构文档必须以当前代码和边界测试为依据，只描述当前入口和当前扩展路径。
- 修改 `internal`、`pkg`、`types` 或 `web/app` 分层边界时，同步更新这里和对应目录 README。
- 如果发现架构漂移，应先写清真实依赖方式、违反的边界和最小修复路径，再改代码。

## 常用验证

```powershell
go test ./... -count=1 -mod=readonly
pnpm --dir web/app test
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
```
