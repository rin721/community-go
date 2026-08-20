# System 模块

`internal/modules/system` 承载控制台系统管理能力，包括菜单、数据字典、系统参数、媒体资源、版本、API catalog、操作记录、错误日志、运行状态、探针和流量观测等功能。

## 职责

- 提供后台控制台通用系统管理数据和运行态观测能力。
- 从 HTTP route contract 派生 API catalog，并服务菜单权限、权限同步和接口审计。
- 管理媒体资源、版本信息、字典、参数、操作记录、错误日志和探针结果。
- 为前端后台提供可观测性、配置和系统资源管理接口。
- 通过应用生命周期后台任务补偿清理断点上传残留分片和流量探针旧结果。

## 分层

| 目录 | 职责 |
| --- | --- |
| `model` | 系统管理领域模型、状态、分页和过滤条件 |
| `service` | 系统管理用例、API catalog 同步、菜单权限校验、媒体与观测逻辑 |
| `repository` | 数据库持久化实现，隔离 ORM、SQL、事务和查询细节 |
| `handler` | HTTP 输入输出适配，保持 DTO 稳定并调用 service |

## 扩展规则

- 新增系统管理能力时，先判断是否属于平台基础能力；业务领域能力应新增业务模块，不应塞入 System。
- System service 可以编排模块内用例，但不得初始化数据库、缓存、存储、HTTP client 或日志组件。
- 新增菜单、字典、参数、媒体、版本或 API catalog 行为必须同步权限、审计、i18n、OpenAPI 和前端页面。
- repository 必须把数据库、迁移缺失、存储异常等错误返回给 service，不得吞掉后用空结果伪装成功。
- 可观测性接口必须返回真实状态；日志记录不能替代错误返回。
- 流量劫持 SSE 写入失败时必须结束当前 stream 并记录 warn，不能继续 flush 或伪装为仍在推送。
- 后台清理类任务必须返回执行错误，由应用层调度器统一记录，不得在 repository 或工具库中静默吞掉状态。

## 验证命令

```powershell
go test ./internal/modules/system/... -count=1 -mod=readonly
go test ./internal/app/adapters/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
```
