# 057 需求

## 状态与依据

- 研究门禁：已通过，依据 [R001](research/R001-current-capability-and-architecture-audit/report.md) 与 [R002](research/R002-mainstream-options-and-security/report.md)。
- 本轮授权：纯文档规则、研究、计划与当前 authority 更新。
- 非文档变更：待用户在本计划报告后的后续消息中按任务 ID 或实施批次确认。

## 目标

建立一套长期可执行的技术决策基线：成熟通用能力优先复用，项目特有语义合理自研，第三方按边界价值隔离，现有架构允许被质疑和演进，最终以可靠性、长期维护成本、工程复杂度和真实项目收益决定。

## 必须满足

### REQ-057-001 当前事实优先

每次选型先追踪当前代码、依赖、composition、真实消费者、配置、资源 owner、错误/安全语义和测试；文档只能作为待复核声明。

### REQ-057-002 成熟候选主动研究

缓存、日志、HTTP Client、ORM、鉴权、权限、安全、限流/熔断、序列化、配置、调度及其他通用能力不得默认沿用或继续自研。重要候选必须核验官方维护、版本、安全、许可证、兼容性、生产适用范围和退出成本。

### REQ-057-003 实现与承载架构双重判断

每项结论同时回答：

1. 当前实现应保留、升级、替换、合理自研还是退役；
2. 当前模块、composition、Kernel/Application Generation 生命周期是否仍适合承载；
3. 若架构阻碍合理接入，重构的可验证收益是否高于迁移风险。

### REQ-057-004 稳定而有价值的项目边界

业务 Service/Model 不直接依赖易变第三方类型。项目拥有业务语义、错误/安全策略和共享资源生命周期；纯局部实现细节不机械复制 Wrapper。

### REQ-057-005 单轨迁移

选定替代方案后，同一实施任务迁移调用方、配置、测试和当前文档，删除失效旧入口与依赖；不保留无截止条件的兼容层、隐藏回退或第二套实现。

### REQ-057-006 分批验证和重新确认

安全止血、低耦合升级、高耦合 PoC、策略重构和承载架构切片分开实施。PoC、benchmark 或安全证据改变公共接口、依赖选择、模块边界、migration 或外部副作用时退回研究并重新确认。

## 当前决策范围

详细矩阵以[技术选型与架构复核基线](../../architecture/technology-selection.md)为当前 authority。至少包括：

- 保留：zap、chi、GORM 连接/事务、golang-migrate、go-redis、gocron、amqp091-go、OpenTelemetry/Prometheus 和当前简单 Core RBAC。
- 已完成安全升级：kin-openapi v0.147.0，并保持项目 OperationGate 为真实认证/授权 owner。
- 后续升级/替换：patrickmn/go-cache、YAML v3；对 JWX、标准 rate limiter 和 resilience 状态机分项评估。
- 合理自研：模块 Repository port、permission/operation/migration 业务语义、Argon2id 薄 Adapter，但补齐参数演进与重哈希语义。
- 高耦合 PoC：Huma 对当前 HTTP DSL、GORM Gen/sqlc 对当前反射 Repository、koanf 对当前通用配置解析部分。
- 架构重构候选：恢复启动期静态业务对象图与经证明可换代的动态资源平面分工。

## 非目标

- 本轮不修改源码、配置、依赖、生成物或测试，不启动/停止服务，不写数据库或外部系统。
- 不一次性替换全部基础设施，不引入统一大框架、Service Locator 或反射 DI。
- 不因候选更流行或版本更新就迁移，也不因现有代码多就保留。
- 不把 `old-backend/` 纳入当前项目决策。
- 不在没有真实需求时引入 OIDC、ABAC/ReBAC、durable workflow、分布式 quota、Kafka/NATS 或第二套 ORM。

## 验收标准

1. 根规则、研究规范、模块开发指南和 architecture/pkg authority 一致表达新基线。
2. 当前能力矩阵逐项给出结论、明确候选、项目职责边界与接入位置。
3. 研究报告包含代码/依赖事实、官方外部证据、局限和刷新条件。
4. 非文档任务有稳定 ID、依赖、验证、停止条件和确认状态。
5. 文档拓扑校验与 `git diff --check` 通过；未执行的漏洞扫描和 PoC 如实保留为待办。
