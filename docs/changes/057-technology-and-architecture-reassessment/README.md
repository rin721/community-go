# 057 通用技术与承载架构重新审视

## 状态

- 研究门禁：**已通过**。
- 纯文档实施：**已完成，按纯文档例外直接验证并提交**。
- 非文档实施：**Batch A、`CACHE-057-001` 与 `AUTHN-057-001` 已完成**；其余 Batch B–E 任务仍待确认。

## 范围

本变更以实际代码、依赖、composition root、调用方和官方外部证据为基础，重新建立通用能力的技术决策基线，并同时判断现有 Kernel/Application Generation 架构是否仍适合作为承载基础。

当前结论、候选与边界已同步到[技术选型与架构复核基线](../../architecture/technology-selection.md)。后续非文档实施只允许覆盖 [`tasks.md`](tasks.md) 中经用户确认的任务 ID。

## 阅读顺序

1. [R001 当前能力与承载架构审计](research/R001-current-capability-and-architecture-audit/report.md)
2. [R002 成熟候选、维护与安全核验](research/R002-mainstream-options-and-security/report.md)
3. [R003 L1 缓存必要性、一致性与候选适配复核](research/R003-cache-l1-necessity-and-candidate-fit/report.md)
4. [R004 序列化真实边界与 YAML 稳定迁移路径复核](research/R004-serde-runtime-boundary-and-yaml-path/report.md)
5. [R005 HTTP 入口速率与过载保护边界复核](research/R005-http-entry-rate-and-overload-boundary/report.md)
6. [R006 认证库与凭据校验边界复核](research/R006-authn-library-and-credential-boundary/report.md)
7. [需求](requirements.md)
8. [设计](design.md)
9. [任务与确认状态](tasks.md)

## 关键结论

- 保留有成熟生态支撑且边界合理的能力，例如 `zap`、`chi`、GORM 的连接/事务基线、`golang-migrate`、`go-redis`、`gocron`、`amqp091-go`、OpenTelemetry 和 Prometheus。
- `kin-openapi` 已从 `v0.142.0` 单轨升级到 `v0.147.0`，补齐 request validation panic 回归与 OperationGate fail-closed 证据；后续替换 HTTP DSL 的 PoC 仍独立待确认。
- cache 深化追踪确认当前没有 production typed L1 消费者，默认 L1 又缺少容量上界和跨实例失效；`CACHE-057-001` 已单轨退役 L1 与 `patrickmn/go-cache`，Redis 成为唯一 authority，并收紧 miss/error 语义。Otter v2/ttlcache v3 只保留为满足明确收益、内存和陈旧预算后的候选。
- YAML v4 当前仍为 RC，不符合稳定生产依赖基线；修订计划先迁移到官方维护的稳定 `go.yaml.in/yaml/v3 v3.0.5`，并删除无仓库内消费者的 `pkg/codec`。JSON 继续使用标准库，MessagePack 只保留在 cache 私有边界并由 CACHE 任务决定其 wire 语义。
- HTTP 自研 token bucket 应由 `golang.org/x/time/rate v0.15.0` 替换，但现有非阻塞 channel semaphore 直接表达 503 过载策略，应保留。限流修订计划增加显式 `local/disabled` 模式，保持 generation-local，不冒充分布式或主体 quota。
- AuthN 保留成熟且活跃维护的 `jwx/v3` 与 Go 官方 `x/crypto/argon2`；不为版本号迁移到仍强制实验性 jsonv2 的 JWX v4，也不引入无法消除敌对 PHC 资源风险的小众 Argon2 Wrapper。项目只保留认证策略、生命周期、受限 PHC 与 `NeedsRehash` 边界，不自行实现 JOSE 或密码学。
- 模块自有 Repository port、permission key、migration SQL 和 operation 语义具有项目特有价值；通用算法和框架机制不应继续默认自研。
- 当前 Application Generation 把业务对象图与动态资源平面一起重建，已经超出早期研究建议的最小动态范围。后续先建立 owner/reload 矩阵，再用最小切片验证静态对象图与动态资源平面分工，不做一次性 Kernel 重写。
- 030、037、038 等历史任务是实施证据，不再自动构成继续沿用其依赖或承载架构的理由；安全、维护状态和新用例必须按本基线刷新。
