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
| Admin WebUI | `webui/`、`webui.hosting` 配置节、`VITE_WEBUI_DATA_SOURCE` 环境声明、WebUI 本地启动指南 | 应用 WebUI 托管组件：托管模式由 `webui.hosting.enabled` 选择；静态 SPA 处理器无共享状态、磁盘即事实；托管前构建脚本由 CLI/启动期（development、缺产物）调用；数据源环境由 WebUI 显式声明（默认 server-hosted；separated 模式 A；mock 全 WebUI 本地数据），模块 mock 数据模块自有（`MockSource` + 生成 `webuiMockRegistry`），mock manifest 由 Go catalog 投影生成 | 模式 B（Go 服务托管）本机 HTTP 验收通过（含 `/management/*` facade 同源读取）；mock 环境零后端 boot/导航/双语徽标由 Playwright mock project 与 Vitest 覆盖（本机受限时记录 CI/后续项）；Playwright 托管模式 E2E 与容器 runtime 冒烟列入 CI/后续独立验证 | 外部浏览器体验、生产部署与容器 runtime 仍需独立验证；静态门禁不替代 E2E/视觉 |
| 可查询审计 | `auth:audit:read`、`/api/v1/auth/audit`、`internal/module/auth/{binding/migration,adapter/audit/storage,binding/http}` | Auth module：迁移集 `auth_schema_migrations` 与表 `auth_audit_events`；持久化 Sink 由模块内部装配，composition 只注入数据库租约 | Go 单元（写入/查询/脱敏/保留上限）、migration SQLite 可重复、WebUI Vitest | 自动归档/导出语义、异地审计聚合、外部审计系统接入（首版不做） |
| 会话集中管理 | `iam:session:read/revoke`、`/api/v1/iam/sessions`、`/api/v1/iam/sessions/revoke`、`internal/module/iam/{service,repo,binding/http}` | IAM module（复用 `iam_sessions` 表，无新 schema） | Go 单元（列表摘要/批量吊销/owner 不变量）、WebUI Vitest、e2e | 会话级并发上限策略、设备指纹、按 IP/UA 过滤（未列入首版） |

## 使用规则

- 配置、外部资源和后台 runner 都必须有明确 owner、取消/关闭和失败边界。
- “本地静态门禁通过”只证明代码、生成物或构建链对应的范围；不能推导出外部协议、生产部署或浏览器体验已经通过。
- 新增能力时，除修改实现和测试，还必须在[文档治理规范](../development/documentation-governance.md)中完成影响评估。
