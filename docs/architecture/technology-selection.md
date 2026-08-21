# 技术选型与架构复核基线

本文是项目选择、保留、升级或替换通用技术时的当前 authority。它要求同时审查具体实现和承载架构，不把现有代码、最小改动或“统一封装”当作当然正确的前提。当前代码事实与外部候选的完整快照见 [057 研究与计划](../changes/057-technology-and-architecture-reassessment/README.md)。

## 决策原则

1. 先定位实际定义、composition root、调用方、资源 owner、错误/安全语义和测试，再读取设计文档。
2. 把能力分类为标准库、成熟第三方、项目特有逻辑或自研通用机制；已有自研代码不自动获得保留优先级。
3. 对重要候选核对官方源码、release、维护状态、安全公告、许可证、Go 版本、生产适用范围和退出成本。
4. 同时比较实现适配和架构适配。若当前生命周期、装配或抽象迫使成熟方案增加无价值兼容层，优先研究承载架构本身。
5. 以可验证收益决定保留、升级、替换、自研、退役或重构；不为更新而更新，也不为解耦机械封装。
6. 安全修复、依赖升级、能力替换和架构重构分批交付。高优先级漏洞不得等待长期重构，PoC 结论不得直接冒充生产迁移授权。

## 抽象与接入边界

以下任一条件成立时，应建立项目自有窄契约或 Adapter：

- 第三方类型会进入业务 Service、Model 或跨模块公共契约；
- 项目需要统一错误、安全、超时、配置、资源关闭或诊断语义；
- 同一能力有多个实现，或替换概率和迁移成本都足够高；
- 共享连接、Client、listener 或后台任务必须由 composition/生命周期 owner 治理。

只在一个模块 Adapter 内使用、没有共享资源和稳定边界价值的库可以直接依赖。禁止把第三方 API 原样复制到项目接口，也禁止业务调用方自行构造第二套共享 Client。

## 当前能力决策矩阵

下表是 2026-08-22 的研究基线，不表示待实施项已经完成。版本、安全状态或真实需求变化时必须刷新。

| 能力 | 当前事实 | 当前结论 | 明确候选与项目内职责 |
| --- | --- | --- | --- |
| 日志 | `pkg/logger` 以窄接口封装 `zap v1.28.0`，composition 拥有 sink 与 Sync/Close | **保留**；没有证据证明迁移 `log/slog` 能抵消行为、性能和迁移成本 | 保持 `zap` 为实现；`log/slog` 只作为后续基准候选，不向业务暴露具体 logger 类型 |
| HTTP server/router | `net/http + chi v5.3.1`，项目拥有 server 生命周期与错误语义 | **保留** | `chi` 只承担路由；标准库承担 server/transport；项目边界继续拥有 Problem Details、超时和关闭语义 |
| HTTP Client | `pkg/httpx` 在 `net/http` 上自研请求、响应和可选重试 | **保留标准库核心，重构策略层**；通用 Client 不应默认决定非幂等重试 | `net/http` 为 transport；`otelhttp` 承担标准观测；`failsafe-go` 为 retry/timeout/circuit/bulkhead 首选 PoC，策略由具体下游 profile 显式注入 |
| HTTP 契约/OpenAPI | `pkg/httpx/contract` 自研 typed DSL；`kin-openapi v0.147.0` 参与生成与请求验证 | **安全升级已完成，替换 PoC 待确认**；不能因 030 已落地就排除成熟框架 | 继续使用本次研究时最新的 `kin-openapi v0.147.0`；以 `Huma v2` 作为保持 code-first 与 chi 的首选 PoC，`ogen` 只在改为 spec-first 时比较；模块仍拥有 operation 语义，真实认证/授权由项目 `OperationGate` fail-closed 执行 |
| ORM/Repository | `GORM v1.31.2` 活跃；`pkg/database` 又实现反射式 Schema、Query 和通用 Repository | **保留 GORM 连接/事务基线，复核自研 Repository 架构** | 用 IAM/Organization/Navigation 的真实 join、分页、乐观锁与三方言查询比较当前实现、`gorm.io/gen` 和 `sqlc`；业务仍依赖模块自有 Repository port，不暴露 GORM 类型 |
| Migration | 使用 `golang-migrate` 与模块自有 migration set | **保留** | `golang-migrate` 负责版本执行；模块拥有 SQL 与兼容语义，不使用 GORM AutoMigrate 替代发布 migration |
| Cache | typed Client 当前使用 `patrickmn/go-cache` L1 + `go-redis/v9` L2，但 production 没有 typed Client 消费者；L1 无容量上界，tag 失效不能传播到其它实例 | **退役默认 L1，保留 Redis 与项目缓存语义**；换本地容器不能解决无真实收益和跨实例陈旧 | `go-redis/v9` 继续只存在于 Adapter，项目保留 typed key/tag/错误边界；删除 go-cache、本地 tag/cleanup 状态。真实消费者给出命中率、内存和陈旧预算后，高并发/weight 场景优先 PoC `Otter v2`，简单 TTL/容量场景 PoC `ttlcache v3` |
| JWT/JWK | Auth Adapter 使用 `jwx/v3` 并显式校验 issuer/audience/algorithm | **升级评估** | 评估 `jwx/v4` 迁移与安全差异；若新增 OIDC，优先 `coreos/go-oidc/v3 + x/oauth2`，不自研 discovery、nonce 或 token 验证 |
| Password | IAM Adapter 基于 `x/crypto/argon2` 实现 Argon2id，参数高于 OWASP 当前最低建议 | **合理自研薄 Adapter，但需补齐演进语义** | 保留 `x/crypto/argon2`；编码解析必须读取并校验存量参数，支持 `NeedsRehash`，并用资源预算和负向测试验证，避免把密码算法扩展成通用 crypto 框架 |
| Permission/AuthZ | code-defined permission catalog + IAM 数据库存储 Core RBAC；当前没有租户、资源关系或 ABAC | **保留当前简单模型** | 出现 domain RBAC/ABAC 时比较 `Casbin v3`；出现跨资源 ReBAC/集中决策时比较 `OpenFGA`；没有真实语义前不引入外部 policy engine |
| CORS/安全头/CSRF | CORS、安全头和 Same-Origin/CSRF 为项目中间件；当前安全头只覆盖三个基础 header | **专项复核，不机械全换** | CORS 比较 `rs/cors`；安全头比较 `unrolled/secure` 与项目显式 policy；依据 API 与 WebUI 交付方式补齐 HSTS/CSP/COOP 等部署语义，CSRF 继续由 IAM session 边界拥有 |
| 限流/过载 | 单进程全局 token bucket 与并发上限均为自研 | **替换通用算法，保留边界语义** | `golang.org/x/time/rate` 承担单进程 token bucket；并发上限继续可由有界 semaphore 表达；分布式配额或业务 quota 必须另立网关/Redis 方案，不能伪装成本地 limiter |
| 重试/熔断 | `pkg/resilience` 自研固定指数退避和只能手工 Reset 的连续失败 breaker | **替换候选优先** | `failsafe-go` 作为组合策略首选；若只需 breaker，比较 `sony/gobreaker/v2`，重试退避可比较已在依赖树中的 `cenkalti/backoff/v5`；项目只保留策略命名、错误分类和观测边界 |
| 序列化 | 标准 `encoding/json`、cache 私有 `msgpack/v5`、已归档 `gopkg.in/yaml.v3`；自研 `pkg/codec` 无仓库内消费者 | **保留标准 JSON；迁移官方稳定 YAML v3；退役无价值 Codec；cache wire format 独立决策** | 直接 YAML import 迁移到 `go.yaml.in/yaml/v3 v3.0.5`；v4 当前仅 RC，不进入 production direct dependency。删除 `pkg/codec`，各协议 owner 直接使用库；MessagePack/JSON/CBOR 的 cache wire 选择归 CACHE 任务，不机械换格式 |
| 配置 | 自研 strict binding/defaults/watch/atomic file，YAML + mapstructure；Viper 只是工具依赖的间接依赖 | **保留项目语义，复核是否过度承担通用解析** | 比较当前 parser 与 `koanf v2` 的 provider/parser 组合；只替换能减少依赖和自研解析的部分，owner、未知节拒绝、候选验证和失败保留旧代仍属项目语义 |
| 定时调度 | `gocron/v2` 触发器 + 项目 schedule binding/execution/Redis lease | **保留** | `gocron/v2` 继续只在内部 Adapter；项目契约拥有任务身份、execution、准入、失权和诊断；耐久任务/工作流不是该能力，需按真实需求另评 `Temporal`、`River` 或 `Asynq` |
| Messaging | 官方 `amqp091-go` + 项目 message contract/binding/consumer lifecycle | **保留，等待真实 RabbitMQ 门禁** | RabbitMQ Adapter 继续隔离 broker 类型；Kafka/NATS 不在没有业务语义时预选 |
| Observability | OpenTelemetry、OTLP、Prometheus 已在 Kernel Adapter，项目拥有低敏 observation 契约 | **保留并补标准 instrumentation** | 优先官方 `otelhttp` 等 instrumentation，不自研 trace propagation；项目保留采样、字段脱敏、diagnostics 和 exporter 生命周期边界 |

## 需要架构解决的问题

### 1. 恢复静态对象图与动态资源平面分工

当前 Application Generation 会一起重建底层资源、业务模块、路由、Scheduler、Messaging 和管理面。既有研究曾明确建议“只有确需运行期安全替换的底层资源进入动态 Capability 平面，业务对象图使用普通构造函数”，但当前实现范围已经扩大。

后续必须以真实配置变化和可用性收益逐项证明热重载价值。默认目标是：

- 业务 Model/Service/Handler 与不需要换代的库保持启动期静态显式构造；
- 只有能定义候选构造、准入、排空、回滚和资源所有权的能力进入动态平面；
- 不适合并存或热换的能力明确 `RestartRequired`，不为“无感”叠加兼容状态机；
- 暂不引入 Fx/反射 DI；只有对象图样板出现可测量成本时再评估。

这是一项目标架构，尚未实施。迁移必须先绘制 capability/consumer/owner/reload 矩阵，再选择最小垂直切片，不允许一次性重写 Kernel。

### 2. 把技术策略从通用 Client 中拆出

HTTP 重试、熔断、限流、缓存加载和执行恢复都涉及幂等、失败分类、budget 与观测。基础 Client 只负责可靠 transport 和资源边界；调用场景或命名 profile 决定策略。这样成熟 resilience 库可以在项目策略边界内接入，而不用迎合现有每个 Client 的私有重试实现。

### 3. 让模块拥有业务查询和授权语义

通用 Repository、通用权限引擎或通用 HTTP DSL 不应替模块决定业务查询、授权模型和 operation 语义。成熟工具负责 SQL/ORM、policy evaluation 或 OpenAPI/JSON Schema 的通用机制；模块 port、permission key、事务边界和业务错误仍由项目拥有。

## 实施门禁与顺序

1. **安全止血**：升级受公告影响的依赖，重建与 Go 1.26 匹配的扫描工具，运行 `govulncheck`、测试和契约负向门禁。
2. **低耦合替换**：先退役当前无收益且语义不完整的默认 L1；迁移官方稳定 YAML v3 路径并删除无消费者 Codec；`x/time/rate`、JWX v4 分别做小范围 PoC 和单轨迁移。未来 L1 与 YAML v4 必须由真实需求、稳定版本和量化门禁重新授权。
3. **策略层重构**：统一 HTTP/execution 的 retry、timeout、circuit、bulkhead 语义，再决定 `failsafe-go` 或较小组合。
4. **高耦合 PoC**：以真实模块比较 Huma、当前 HTTP DSL；以真实查询比较当前 Repository、GORM Gen、sqlc。
5. **架构切片**：根据 owner/reload 矩阵把一个不需要动态换代的模块或能力移回静态平面，证明启动、重载、停止和回滚收益后再扩大。

每一步都是非文档变更，必须使用 057 的明确任务 ID，在计划报告后的后续消息中获得确认；新事实改变依赖、公共接口、迁移或生命周期边界时重新研究和确认。
