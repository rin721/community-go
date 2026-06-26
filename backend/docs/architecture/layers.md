# 分层架构

当前仓库保留既有 Go 目录结构，不做无意义的大规模搬迁；分层通过包职责、依赖方向和边界测试约束。

## 层次映射

| 层次 | 当前目录 | 责任 |
| --- | --- | --- |
| 应用入口 | `cmd/console` | 声明 CLI/进程入口，保持轻薄 |
| 应用装配 | `internal/app` | 配置、日志、数据库、缓存、存储、模块、HTTP/RPC、生命周期 |
| 业务模块 | `internal/modules` | IAM、System 和未来业务模块 |
| 传输适配 | `internal/transport`、`internal/middleware` | HTTP/RPC 路由、中间件、route contract、OpenAPI |
| 共享边缘端口 | `internal/ports` | app、transport、middleware、repository infrastructure 之间的窄接口 |
| 基础设施库 | `pkg` | 数据库、缓存、日志、存储、HTTP server、RPC server、CLI 等可复用能力 |
| 平台类型 | `types` | 生命周期、认证上下文、跨层契约、错误码、结果封装 |

## 模块约束

- `model` 承载领域数据结构、领域常量和持久化模型。
- `service` 承载用例编排和领域规则，并定义自己需要的最小接口。
- `handler` 只做输入输出适配，不承载业务规则。
- `repository` / `infrastructure` 实现 service-local contract，并隔离 ORM、SQL、缓存、存储等技术细节。

## 依赖方向

- `pkg` 不能导入 `internal/app` 或 `internal/modules`。
- 业务 service 不应直接导入 `pkg` 具体实现，也不应导入同模块 `repository` 实现。
- 数据库、缓存、日志、HTTP client、SMTP、存储、执行器等基础设施应由应用装配层或模块 infrastructure 创建，再通过接口注入。
- 新业务扩展通过显式模块新增，注册路径需要在应用装配和 route contract 中可见。

## 类型边界

全局 `types` 只保留平台级错误、结果封装、HTTP/应用常量、认证上下文和跨层契约。缓存 key、executor pool 名称、业务枚举、DTO 和模块模型应留在对应模块或基础设施包内。需要在中间件、传输层和多个模块之间共享的请求主体与权限判断上下文统一放在 `types/auth`，不要从非 IAM 模块或中间件直接导入 IAM service。

## 错误与结果边界

- `types/errors` 和 `types/result` 只定义跨层错误码、响应结构和输出辅助，不承载具体业务分支。
- 模块 service 返回业务错误，handler 负责映射 HTTP 状态和 i18n message key。
- handler 参数解析失败必须保留字段上下文，不得把 `pageSize`、`userId` 等字段级错误折叠成通用错误。
- `pkg` 与模块基础设施不得吞掉会影响业务正确性的错误；best-effort 清理或缓存降级必须明确其影响边界。

详细约定见 [错误与结果契约](error-result-contracts.md)。
