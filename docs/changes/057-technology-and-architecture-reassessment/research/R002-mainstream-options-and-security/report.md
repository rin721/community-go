# R002 成熟候选、维护状态与安全适用范围核验

## 研究方法

外部事实只采用官方仓库、release、安全公告、Go 标准库文档和 OWASP 指南。候选必须能落到当前项目的具体职责边界；本报告不以下载量、Star 或“更现代”作为选择理由。

## 已核验事实

### 官方证据索引

| 主题 | 官方来源 | 本次用途 |
| --- | --- | --- |
| kin-openapi | [Releases](https://github.com/getkin/kin-openapi/releases)、[fail-open 公告](https://github.com/getkin/kin-openapi/security/advisories/GHSA-r277-6w6q-xmqw)、[request validation DoS 公告](https://github.com/getkin/kin-openapi/security/advisories/GHSA-jpcw-4wr7-c3vq)、[response header panic 公告](https://github.com/getkin/kin-openapi/security/advisories/GHSA-74vm-87hj-r66f) | 当前/修复版本与触发范围 |
| L1 Cache | [patrickmn/go-cache releases](https://github.com/patrickmn/go-cache/releases)、[Otter](https://github.com/maypok86/otter)、[ttlcache](https://github.com/jellydator/ttlcache) | 维护状态、容量/TTL/生命周期候选；Otter 为 Apache-2.0，ttlcache 为 MIT |
| HTTP/SQL/韧性 | [Huma](https://github.com/danielgtaylor/huma)、[sqlc](https://github.com/sqlc-dev/sqlc)、[failsafe-go](https://github.com/failsafe-go/failsafe-go) | code-first/chi、类型安全 SQL、组合韧性能力；三者均为宽松开源许可证候选 |
| 序列化与身份 | [YAML maintained fork](https://github.com/yaml/go-yaml)、[JWX releases](https://github.com/lestrrat-go/jwx/releases) | v3/v4 维护边界与 JWX major 演进 |
| 授权 | [Apache Casbin](https://github.com/apache/casbin)、[OpenFGA](https://github.com/openfga/openfga) | domain/ABAC 与 ReBAC 候选边界；两者为 Apache-2.0 |
| 标准机制与安全基线 | [`x/time/rate`](https://pkg.go.dev/golang.org/x/time/rate)、[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) | token bucket 与 Argon2id 当前最低建议 |

许可证只是候选资格的一项。实施前仍需由项目许可证/NOTICE 门禁复核具体版本及其 transitive dependency；本报告没有把“宽松许可证”等同于可直接采用。

### 需要优先处置

- `patrickmn/go-cache` 最新 release 仍是 2017 年的 `v2.1.0`。它能工作不等于仍是当前默认候选，尤其当前项目还缺少 L1 容量上界。
- 当前 `kin-openapi v0.142.0` 低于本次研究时最新 `v0.147.0`。官方公告显示 `<=0.143.0` 存在请求验证未授权拒绝服务和 `ValidationHandler` fail-open 问题，`<=0.145.0` 还有响应 header 验证 panic；项目当前调用路径并不等同于全部公告触发路径，但旧版本仍应优先升级并做负向验证。
- `gopkg.in/yaml.v3` 所在官方项目说明 v3 处于 legacy security-fix 状态，持续开发迁往 `go.yaml.in/yaml/v4`；迁移必须用项目现有配置与本地化 fixture 验证差异。

030-R002 的版本更新刷新条件已经触发，因此其 metadata 标记为 `needs-refresh`。该历史记录仍能证明当时的生成路径可行性，但不能继续作为 `kin-openapi v0.142.0` 当前维护或安全状态的证据。

### 候选与适用边界

| 能力 | 官方能力事实 | 当前项目中的候选职责 | 不能据此得出的结论 |
| --- | --- | --- | --- |
| L1 Cache | Otter v2 提供泛型、容量/权重、TTL 与并发缓存；ttlcache v3 提供泛型 TTL、capacity 和显式 Start/Stop | 替换 L1 存储与淘汰机制；项目仅保留真正需要的 key/tag/L2 语义 | 未做 benchmark，不能直接决定 Otter 或 ttlcache |
| HTTP 契约 | Huma v2 可使用现有 chi、code-first 生成 OpenAPI 3.1，并提供标准错误；ogen 是 spec-first 生成器 | Huma 用于保持 code-first 的替代 PoC；ogen 只在 authority 改为 spec-first 时比较 | 不能因功能覆盖就直接删除项目 operation/policy 语义 |
| ORM/SQL | GORM 当前 release 与生态仍活跃；sqlc 从 SQL 生成类型安全 Go 并支持 PostgreSQL/MySQL/SQLite | GORM 保留连接/事务基线；sqlc 与 GORM Gen 在真实复杂查询上比较，模块保留 Repository port | 不能按“ORM 对 SQL”偏好一次性全仓迁移 |
| 韧性 | failsafe-go 组合 Retry、Circuit Breaker、Rate Limiter、Bulkhead、Timeout 并有 HTTP 集成；gobreaker/v2 提供更窄 breaker | 由项目命名 profile 决定错误分类、幂等和观测，第三方实现通用状态机 | 不能把同一 retry policy 套给所有 HTTP 方法和后台任务 |
| 限流 | `golang.org/x/time/rate` 是 Go 官方扩展库 token bucket | 替换进程内通用算法；composition 仍拥有 limiter 生命周期和配置 | 不能把进程级 load shedding 宣称为分布式业务 quota |
| AuthN/AuthZ | `jwx` 有活跃 v4；`coreos/go-oidc/v3` 提供 OIDC；Casbin v3 覆盖 RBAC/ABAC/domain；OpenFGA 面向 ReBAC | 按 JWT/OIDC、domain/ABAC、ReBAC 的真实需求分别选择，模块仍拥有 permission key 与业务授权入口 | 当前 Core RBAC 不需要为了未来可能性引入外部 policy engine |
| 配置/调度 | koanf v2 以 provider/parser 组合配置；gocron v2 当前仍活跃 | koanf 只比较解析/provider；项目保留 owner、strict candidate 和 reload 失败语义。gocron 继续承担触发器 | durable workflow 不能由 gocron 或 Kernel reload 冒充 |
| 日志/观测 | zap v1.28 仍在维护；Go 提供 `log/slog`；OpenTelemetry Go 提供 `otelhttp` 等标准 instrumentation | 保留当前窄 Logger/zap；新 HTTP 观测优先标准 instrumentation | 没有收益数据，不启动 slog 迁移或第二套日志体系 |

### 密码和安全中间件

- OWASP 当前对 Argon2id 给出最低内存/迭代组合；当前项目参数高于最低建议，因此问题不是“换一个密码库”，而是正确解析存量参数、限制资源、恒定语义比较和提供 rehash 路径。
- `rs/cors`、`unrolled/secure` 可作为 CORS/安全头专项比较对象，但项目的 Session Same-Origin/CSRF、代理终止 TLS 和具体 CSP 仍是部署与业务边界，不能机械外包给 middleware 默认值。

## 事实、推断与目标设计分离

- **事实：** 上述库在本次验证日期有官方维护、release 或安全文档；这只证明候选资格。
- **推断：** `kin-openapi` 升级、L1 Cache 替换、YAML v4 迁移和标准 token bucket 是低耦合优先项，预期收益清晰。
- **目标设计：** Huma、sqlc/GORM Gen、failsafe-go、koanf、JWX v4 和静态/动态架构分工必须经项目真实用例 PoC 后才能成为实施结论。

## 局限与刷新条件

- 未核验所有 transitive dependency 的完整 CVE/OSV 图；当前 `govulncheck` 工具链不匹配，必须在安全任务中重建扫描证据。
- 官方仓库声明的生产用户或功能不能替代项目自己的负载、错误、资源与迁移验证。
- release、安全和 Go 版本易漂移；实施每个任务前都要重新核验官方当前状态，不可只引用本报告快照。

## 对当前任务的影响

形成明确的保留/升级/替换/合理自研/架构重构矩阵，并支持按安全风险和耦合度分批实施。候选清单已经收敛到项目职责边界，而不是无优先级技术名录。
