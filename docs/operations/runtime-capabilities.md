# 运行能力矩阵

本文集中说明当前运行能力的配置入口、资源所有权、生命周期和验证边界。它是状态索引，不复制各能力的完整设计；若状态改变，必须同步更新本文和对应主题文档。

| 能力 | 当前入口 | 资源/生命周期 owner | 当前验证 | 未覆盖边界 |
| --- | --- | --- | --- | --- |
| Config | `config init`、配置说明、环境变量 | Application 配置集合与 generation | Go 测试、启动和 reload 相关检查 | 外部部署平台注入策略 |
| Database/Migration | `db migrate status/up`、database/migration 文档 | 多 Set Migration Catalog、one-shot runner 与数据库组件 | IAM/Organization/Navigation/Todo SQLite baseline、Catalog/错误门禁；Postgres/MySQL SQL/checksum 静态校验 | 生产数据库协议需配置外部 DSN 独立验证 |
| Cache/Coordination | 配置中的 cache/Redis 节 | Kernel App 连接与 lease/close owner | 单元测试、模拟依赖 | 真实 Redis、多实例故障恢复 |
| Storage | storage 配置节、Storage Capability | Kernel App Manager 与对象存储资源 owner | Go 测试、契约边界 | 真实 S3 兼容服务和生产凭据 |
| Observability | logger、diagnostics、metrics、OTLP 配置 | Kernel App observability 与注入 Logger | Go 测试、低敏日志检查 | 外部 collector/后端接收验证 |
| Execution | `pkg/execution` 与模块接入文档 | Application 命名 policy；memory Store 同步拥有幂等与记录 | attempts/budget/cancel/错误分类、HTTP one-shot、消息单次 attempt 的 Go/race 测试 | 外部持久化 backend、degraded write、breaker、多实例部署 |
| HTTP 入口保护 | `http.rateLimit`、`http.maxInFlight` | 每个 Application Generation 私有的 x/time/rate bucket 与 channel 过载门禁 | mode/输入/refill/并发、429/503、CORS preflight、generation 重建的 Go/race 测试 | Principal/IP/route quota、跨副本一致性、gateway 容量验证 |
| Schedule | 模块 Schedule Binding、scheduler 配置 | 统一 scheduler、Execution、coordination lease | Go 测试与本地静态检查 | 真实多实例 owner 交接 |
| Messaging | Message Contract/Binding、RabbitMQ 配置 | Provider Adapter、consumer generation 与 ack/retry | Go 测试与静态门禁 | RabbitMQ 真实协议需外部运行证据 |
| Admin WebUI | `webui/`、WebUI 本地启动指南 | Vite 宿主、静态 WebUI Catalog、数据库 NavigationPolicy、IAM typed HTTP 与 Auth decision | IAM、Organization、Navigation 页面与 Manifest 策略刷新通过 Go/WebUI/Playwright/视觉门禁 | PostgreSQL/MySQL 实库、Docker/release 与真实部署环境仍需独立验证 |

## 使用规则

- 配置、外部资源和后台 runner 都必须有明确 owner、取消/关闭和失败边界。
- “本地静态门禁通过”只证明代码、生成物或构建链对应的范围；不能推导出外部协议、生产部署或浏览器体验已经通过。
- 新增能力时，除修改实现和测试，还必须在[文档治理规范](../development/documentation-governance.md)中完成影响评估。
