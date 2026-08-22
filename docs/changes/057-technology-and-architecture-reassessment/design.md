# 057 设计

## 设计概要

本变更不选择“一套框架接管一切”，而是建立两层决策：先判断通用实现是否应复用成熟方案，再判断当前架构是否为合适载体。输出是可追踪矩阵和分批实施队列，不是技术名录。

依据：[R001 当前实现与架构事实](research/R001-current-capability-and-architecture-audit/report.md)、[R002 外部候选与安全事实](research/R002-mainstream-options-and-security/report.md)、[R003 L1 必要性与候选适配](research/R003-cache-l1-necessity-and-candidate-fit/report.md)、[R004 序列化与 YAML 稳定路径](research/R004-serde-runtime-boundary-and-yaml-path/report.md)、[R005 HTTP 入口速率与过载边界](research/R005-http-entry-rate-and-overload-boundary/report.md)、[R006 认证库与凭据边界](research/R006-authn-library-and-credential-boundary/report.md)、[R007 resilience、Execution 与 HTTP Client 边界](research/R007-resilience-execution-and-http-boundary/report.md)。

## 决策流程

```text
真实用例与消费者
  -> 当前定义 / composition / owner / 失败语义
  -> 标准库 / 成熟第三方 / 项目特有 / 自研通用 分类
  -> 官方维护、版本、安全、兼容与生产范围核验
  -> 实现适配收益 + 承载架构适配收益
  -> 保留 / 升级 / 替换 / 合理自研 / 退役 / 架构重构
  -> PoC 或迁移任务 -> 单轨验证 -> 当前 authority 同步
```

## 职责边界

| 层次 | 项目拥有 | 第三方可以拥有 | 禁止泄漏 |
| --- | --- | --- | --- |
| 业务模块 | 用例、Model、Repository port、permission/operation key、事务和业务错误 | 模块 Adapter 内的局部实现细节 | ORM model、policy engine object、HTTP framework context 进入 Service/Model |
| 项目能力 | 窄契约、配置/错误/安全策略、命名 profile、低敏诊断 | cache/codec/retry/breaker/schema 等通用算法 | 原样复制第三方全量 API 的 Wrapper |
| composition | 实现选择、共享资源 owner、Start/Ready/Stop、静态/动态分类 | 具体 Client、connection、exporter、trigger | 业务调用方创建第二套共享资源或查询容器 |
| transport/tooling | route binding、生成、验证、协议呈现 | chi、kin-openapi、Huma/ogen 候选、标准 instrumentation | 模块为适配框架而失去 operation 语义 ownership |

## 承载架构目标

### 静态对象图

业务 Model/Service/Handler、无共享资源的库和不支持安全换代的对象，默认由显式构造函数在启动期构建。配置变化若无法定义候选准入、并存、排空和回滚，则明确 `RestartRequired`。

### 动态资源平面

只有共享连接、listener、Consumer、exporter 等能证明运行期换代收益，且具备资源 owner、候选验证、Replacement 与失败保留旧代语义的能力进入动态 Generation。

### 迁移方式

先制作 capability/consumer/owner/reload 矩阵，再选一个无热换价值且调用面小的垂直切片。保持公开行为不变，比较构造复杂度、reload 状态数、停止顺序和故障恢复证据；通过后才扩大，不引入 Fx/反射 DI。

## 实施批次

### Batch A：安全与基线恢复

- 升级 `kin-openapi` 到实施时经官方复核的安全版本，验证现有 code-first 生成和 request validation 负向场景。
- 使用 Go 1.26 构建/运行兼容的 `govulncheck`，建立全仓当前漏洞基线。

不等待 Huma PoC，不改变 HTTP authority。

### Batch B：低耦合升级与替换

- Cache：单轨退役当前无真实消费者、无容量上界且不能跨实例失效的默认 L1，删除 `patrickmn/go-cache`、本地 tag map、cleanup goroutine 与专属配置；保留 Redis typed cache/tag、序列化和 Kernel 共享资源 owner。
- Cache miss：`GetOrLoad`/`GetMany` 只有 `ErrNotFound` 可按 miss 处理，取消、disabled、backend 与 codec 错误必须完整返回。
- 不在本批引入另一 L1 库。未来真实消费者同时给出命中收益、内存 budget、陈旧预算和多实例一致性模型后，按高并发/weight 需求优先 PoC Otter v2，按简单 TTL/容量需求 PoC ttlcache v3。
- `CACHE-057-001` 实施结果：typed Client 已收敛为无资源的 Redis RemoteStore 编解码边界，`RemoteStore.Get` 不再为已删除 L1 返回 TTL，`InvalidateTags` 不再返回仅供本地失效的 key 列表；Redis client 的构造、关闭与 reload owner 仍归 Kernel Cache App。
- Serde：把全部项目直接 YAML import 从已归档 `gopkg.in/yaml.v3` 单轨迁移到官方稳定 `go.yaml.in/yaml/v3 v3.0.5`；v4 当前仍为 RC，不提升为 direct dependency。
- 删除零消费者 `pkg/codec`，不保留兼容包；标准 JSON 由协议 owner 直接使用，cache 私有 MessagePack wire format 不在本任务暗改。
- 用 config duplicate/strict/default golden、i18n fixture、OpenAPI generation golden、docs guard 和完整 Go 门禁验证；v4 stable 后另按格式、安全限制和可删除自研逻辑的实际收益评估。
- 限流：以 `golang.org/x/time/rate v0.15.0` 替换进程内 token bucket 数学与锁；项目薄边界继续拥有 fail-fast 429、Problem 与 Retry-After，不暴露第三方类型。
- 限流配置：增加有类型的 `local/disabled` 模式，缺省保持 `local`；`local` 必须使用正速率和 burst，构造不再静默修正错误。保留 `100/200` 作为现有 scaffold 起点并明确必须按负载/SLO 校准，不把它描述为生产容量保证。
- 过载：保留 channel-based 非阻塞 in-flight semaphore 与 503，不机械改用已有 `x/sync/semaphore`，也不变成等待队列或 weighted bulkhead。
- 生命周期：RateLimiter 与 OverloadLimiter 保持 generation-local；新代从新 policy 状态开始，旧代独立排空。不为跨代 token 复用新增 pool/handoff，整体 Generation 范围留给 Batch E。
- 范围排除：不在本任务增加 Principal/IP/Operation/租户维度、Redis/网关/集中计数、登录防爆破或分布式 quota。
- AuthN：保留 `jwx/v3` 和 `x/crypto/argon2` 两项成熟实现；修正 JWT 运行中取消传递并补安全负向矩阵。密码 port 使用项目 verification result + error，Adapter 在调用 Argon2 前完成受限 PHC 校验并返回 `NeedsRehash`，Service 在成功登录事务内迁移 hash。
- AuthN 不引入仍要求 `GOEXPERIMENT=jsonv2` 的 JWX v4，不引入高层 Argon2 Wrapper、OIDC 或新密码学实现。jsonv2 稳定或 v3 支持状态变化后再刷新选型。

每个项目可以独立确认和回退，不做互相绑定的大提交。

### Batch C：策略层重构

R007 已证明当前没有真实出站 HTTP Client 消费者或 breaker failure domain，Execution 也没有外部 primary。Batch C 不再引入组合大框架，而按实际边界单轨收敛：

- `pkg/httpx` 删除 `RetryCount/RetryWaitTime/RetryMaxWaitTime` 和隐式 transport/status retry；基础 Client 每次只发送一次。未来真实下游 Adapter 自行声明幂等依据、`Retry-After`、错误分类、budget 和观测。
- `pkg/execution` 使用项目自有 retry policy；命名 profile 明确 max attempts、initial/max delay、jitter、attempt timeout 与 total timeout。内部以 `cenkalti/backoff/v7 v7.0.0` 承担 retry/backoff，每次调用创建独立实例，显式关闭库默认 15 分钟 elapsed budget，由 context 成为总 budget authority。
- 不可重试错误保留原错误链；caller cancellation/deadline 保留；只有实际 attempts 耗尽才附加 `ErrRetryExhausted`。第三方类型不进入业务、`Execution` 或 Kernel Access 契约。
- 删除 `pkg/resilience` 及无消费者 breaker；`sony/gobreaker/v2` 只在真实共享下游 failure domain 出现后按 Adapter 重新研究，不建立全局 breaker。
- 删除 `RecoveringStore`、`AsyncRecorder`、Recovery API/配置/diagnostics 和 goroutine。当前 MemoryStore 直接同步承载幂等与记录，Health 只表达 enabled/ready；未来 durable Store 先设计跨副本 Claim 与不可用时 fail-closed/degraded 语义。
- RabbitMQ broker redelivery/重连、Scheduler coordination retry、配置稳定读取和 HTTP 入口 overload 各自保留协议 owner，不并入通用策略层。

### Batch D：高耦合真实用例 PoC

- HTTP：选一组现有 operation，比较当前 typed DSL 与 Huma v2 的声明量、生成一致性、错误/鉴权/政策扩展、chi 接入和升级成本。
- Data：选 IAM/Organization/Navigation 的复杂查询，比较当前 Repository、GORM Gen 和 sqlc 的三方言、事务、乐观锁、分页、错误映射与迁移成本。
- Config：只比较 koanf 能否减少 parser/provider 自研；strict candidate、owner、reload 失败保留旧代仍归项目。

PoC 代码若不能作为最终单轨实现的一部分，应放在任务明确的隔离位置，并在结论后删除；不得把两套 production 实现长期留在仓库。

### Batch E：架构切片

形成完整 owner/reload 矩阵并提交更新计划。任何公共装配、生命周期或 reload 语义变化都属于材料性架构变更，必须在 Batch E 实施前再次确认。

## 失败、回退与验证语义

- 依赖升级失败：保留错误链和测试证据，不能降级为旧漏洞版本并宣称成功。
- PoC 不满足核心语义：记录拒绝原因和退出结论，删除 PoC 代码，不增加兼容层。
- 单轨替换或退役：先证明目标语义、取消、并发、错误和观测门禁，再迁移调用方并删除旧依赖；不得用新库保留没有收益的旧架构。
- 架构切片：启动、reload、旧代保留、stop/wait 和 race 测试必须覆盖；无法安全热换的能力明确 RestartRequired。
- 所有批次执行 `go test ./...`、`go vet ./...`、`go test -race ./...`（适用平台范围）、文档与生成物门禁；安全任务另执行与当前 Go 工具链匹配的 `govulncheck`。

## 文件影响预测

实际文件以确认后的任务设计复核为准：

- Batch A：`go.mod`、`go.sum`、`internal/transport/http/`、`pkg/httpx/contract/`、安全验证记录。
- Batch B：`pkg/cache/`、`internal/kernel/app/cache/`、缓存文档与依赖清单、配置/codec 消费者、`pkg/httpx/production_middleware.go`、IAM auth Adapter。
- Batch C：`pkg/httpx/`、`pkg/resilience/`（删除）、`pkg/execution/`、`internal/kernel/app/execution/`、Todo/Schedule/Messaging 调用方、composition/config/docs 及 `go.mod/go.sum`。
- Batch D：限定 PoC、真实模块 Adapter/测试与生成门禁；不直接改变 production authority。
- Batch E：`internal/composition/`、`internal/kernel/`、模块构造与 lifecycle 测试。
