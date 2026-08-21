# 057 通用技术与承载架构重新审视

## 状态

- 研究门禁：**已通过**。
- 纯文档实施：**已完成，按纯文档例外直接验证并提交**。
- 非文档实施：**待确认**。本轮未修改源码、配置、依赖、测试实现、进程或外部系统。

## 范围

本变更以实际代码、依赖、composition root、调用方和官方外部证据为基础，重新建立通用能力的技术决策基线，并同时判断现有 Kernel/Application Generation 架构是否仍适合作为承载基础。

当前结论、候选与边界已同步到[技术选型与架构复核基线](../../architecture/technology-selection.md)。后续非文档实施只允许覆盖 [`tasks.md`](tasks.md) 中经用户确认的任务 ID。

## 阅读顺序

1. [R001 当前能力与承载架构审计](research/R001-current-capability-and-architecture-audit/report.md)
2. [R002 成熟候选、维护与安全核验](research/R002-mainstream-options-and-security/report.md)
3. [需求](requirements.md)
4. [设计](design.md)
5. [任务与确认状态](tasks.md)

## 关键结论

- 保留有成熟生态支撑且边界合理的能力，例如 `zap`、`chi`、GORM 的连接/事务基线、`golang-migrate`、`go-redis`、`gocron`、`amqp091-go`、OpenTelemetry 和 Prometheus。
- 优先处理 `kin-openapi v0.142.0` 的安全升级，并替换长期未维护的 `patrickmn/go-cache`；YAML、JWX、限流和韧性策略进入分项升级或 PoC。
- Argon2id 薄 Adapter、模块自有 Repository port、permission key、migration SQL 和 operation 语义具有项目特有价值；通用算法和框架机制不应继续默认自研。
- 当前 Application Generation 把业务对象图与动态资源平面一起重建，已经超出早期研究建议的最小动态范围。后续先建立 owner/reload 矩阵，再用最小切片验证静态对象图与动态资源平面分工，不做一次性 Kernel 重写。
- 030、037、038 等历史任务是实施证据，不再自动构成继续沿用其依赖或承载架构的理由；安全、维护状态和新用例必须按本基线刷新。
