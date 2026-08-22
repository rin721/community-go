# 057 任务与证据

## 当前状态

- 研究门禁：已通过。
- 文档与整体方案任务：已通过完成性审计，R001–R013 已收敛全部当前选型、owner/reload 矩阵、实施依赖和停止条件，适用纯文档直接实施例外。
- 非文档任务：用户已于 2026-08-22 明确确认剩余整体计划并授权实施；已完成 Batch A（`SEC-057-001`）及修订后的 `CACHE-057-001`、`SERDE-057-001`、`AUTHN-057-001`、`RESIL-057-001`，其余任务按冻结依赖顺序实施。

## 原始目标逐能力闭环

| 能力 | 研究/证据 | 最终决策 | 实施任务 |
| --- | --- | --- | --- |
| Cache | R001/R003 | Redis authority 保留，退役无收益 L1/go-cache | `CACHE-057-001` 已完成 |
| Logging | R001/R002 | 保留 zap + 项目窄 Logger/lifecycle；不为版本迁 slog | 无新增任务 |
| HTTP Client / resilience | R001/R007 | net/http one-shot；Execution 用 backoff/v7；无真实 failure domain 不引入 breaker | `RESIL-057-001` 已完成 |
| HTTP contract/OpenAPI | R001/R002/R009 | Huma v2 接管 typed binding/schema/validation；保留 chi、Problem、OperationGate | `HTTP-057-001/002` |
| ORM/Repository/Migration | R001/R002/R010 | 保留 GORM resource/transaction 与 golang-migrate；direct GORM concrete repo 退役 generic reflection | `DATA-057-001/002/003` |
| Authentication/credential | R006 | 保留 jwx/v3、x/crypto/argon2；项目拥有受限 PHC、cancel、NeedsRehash | `AUTHN-057-001` 已完成 |
| Permission/AuthZ | R001/R002 | 当前 Core RBAC 有真实业务语义且规模简单，保留项目 catalog/port；无 ABAC/ReBAC 不引入 Casbin/OpenFGA | 无新增任务 |
| Browser security | R002/R006/R012 | rs/cors + CrossOriginProtection 复用标准机制；保留 fail-closed Problem 与 IAM CSRF token；拒绝 secure wrapper | `SEC-057-002` |
| Rate limit/overload | R005 | x/time/rate 替换 token bucket；保留简单 channel 503 与 generation-local policy | `LIMIT-057-001` |
| Serialization | R004 | 标准 JSON；官方稳定 YAML v3；删除无消费者 Codec；cache MessagePack 私有 | `SERDE-057-001` |
| Configuration | R008 | 保留 strict candidate/binding/stable-file；不引入无净删除的 koanf/Viper | `CONFIG-057-001` 文档完成 |
| Scheduling/Messaging | R001/R002 | 保留 gocron trigger、amqp091-go Adapter 与项目 execution/lease/lifecycle；无 durable workflow/Kafka/NATS 需求不预选 | 无新增任务 |
| Observability | R001/R013 | otelhttp 接管标准 HTTP instrumentation；保留 OTel/Prometheus resource、低基数与 diagnostics owner | `OBS-057-001` |
| 承载架构 | R001/R011 | Generation 保留运行态事务；纯 catalog/policy/contract 提升为启动期 Blueprint | `ARCH-057-001` 文档完成、`ARCH-057-002` 待实施 |

## 任务清单

| ID | 批次 | 任务 | 依赖 | 状态 | 完成条件 |
| --- | --- | --- | --- | --- | --- |
| RES-057-001 | 文档 | 审计当前能力、依赖、调用方与承载架构 | 无 | 已完成 | R001 可复核，事实/推断/目标分离 |
| RES-057-002 | 文档 | 以官方来源核验成熟候选、维护与安全状态 | RES-057-001 | 已完成 | R002 有版本日期、适用边界、局限和刷新触发器 |
| DOC-057-001 | 文档 | 更新 AGENTS、研究规范、模块指南、pkg/architecture authority 和导航 | RES-057-001, RES-057-002 | 已完成 | 技术决策基线单一可发现，文档门禁通过 |
| PLAN-057-001 | 文档 | 落实剩余整体技术选择、owner/reload 矩阵和完整实施依赖 | R008-R013 | 已完成 | Config/HTTP/Data/Security/Observability/Architecture 有明确采用或拒绝、接入边界、任务拆分、停止条件和统一确认入口 |
| SEC-057-001 | A | 升级 kin-openapi 并重建 Go 1.26 漏洞扫描证据 | 用户确认 Batch A | 已完成 | v0.147.0、生成/请求负向测试、全仓 govulncheck 和旧版本残留搜索通过 |
| CACHE-057-001 | B | 单轨退役默认 L1 与 go-cache，收紧 Redis typed cache 的 miss/error 语义 | 用户于 2026-08-22 确认修订后的该任务 | 已完成 | 删除本地状态/goroutine/专属配置和 go-cache；Redis typed cache/tag/disabled/cancel/error 语义测试通过；不新增 L1 依赖 |
| SERDE-057-001 | B | 迁移官方稳定 YAML v3 路径并退役无消费者 Codec | 用户于 2026-08-22 确认剩余整体计划 | 已完成 | project direct import 使用 go.yaml.in/yaml/v3 v3.0.5；删除 gopkg direct requirement 与 pkg/codec；config/i18n/OpenAPI/docs fixture 和完整门禁通过；不直引 v4 RC |
| LIMIT-057-001 | B | 用 x/time/rate 替换通用 token bucket，修正入口保护配置语义 | 用户于 2026-08-22 确认剩余整体计划 | 已确认 | x/time/rate v0.15.0 隐藏在项目薄边界；删除自研 refill/lock；增加 local/disabled 严格模式；保留 generation-local 与 channel 503；mode/burst/refill/concurrency/CORS/management/reload、完整 Go 与漏洞门禁通过；不增加主体或分布式 quota |
| SEC-057-002 | B | 用 rs/cors + CrossOriginProtection 收敛浏览器跨域/跨站机制 | R012、用户于 2026-08-22 确认剩余整体计划 | 已确认 | exact/default-deny/Problem/handler-not-called 保留；标准 Vary/preflight 由库处理；IAM Origin+Session+CSRF 不退化；删除手工 header/string-set；不新增 wildcard/credentials/PNA |
| AUTHN-057-001 | B | 保留 jwx/v3 与 x/crypto/argon2，补 JWT 取消/负向矩阵和受限 PHC/NeedsRehash/渐进重哈希 | 用户于 2026-08-22 确认修订后的该任务 | 已完成 | 第三方类型不泄漏；取消原因保留；敌对 PHC 在 Argon2 前拒绝；登录事务重哈希与完整安全门禁通过；不引入 jwx/v4、OIDC 或小众 Wrapper |
| RESIL-057-001 | C | 以 backoff/v7 收敛 Execution retry，并退役无依据的 HTTP/recovery/breaker 状态 | 用户于 2026-08-22 确认修订后的该任务 | 已完成 | backoff/v7 隐藏在 Execution 内部；profile 明确 attempts/jitter/attempt+total budget；HTTP one-shot；删除 pkg/resilience、RecoveringStore、AsyncRecorder 及旧配置/API；Todo/Schedule/Messaging 语义和完整门禁通过 |
| CONFIG-057-001 | 文档 | 比较 koanf/Viper 与当前配置流水线并形成采用/拒绝结论 | R008 | 已完成 | 结论为不引入；保留 strict candidate、stable file、owner/reload，明确未来远程 provider 刷新条件 |
| HTTP-057-001 | D | 引入 Huma v2 并完成代表性 operation 第一片 | R009、SERDE-057-001、用户于 2026-08-22 确认剩余整体计划 | 已确认 | Huma 只进 binding；public body、protected list、version mutation、Problem 可运行；静态生成无资源；OperationGate fail-closed；依赖/安全/生成门禁通过；失败则完整撤回 |
| HTTP-057-002 | D | 全量迁移 HTTP operation 并删除旧 contract/binding 路径 | HTTP-057-001 门禁通过、整体计划已确认 | 已确认 | IAM/Organization/Navigation/Todo 全迁移；删除 pkg/httpx/contract、dispatcher、手工 codec/renderer 与重复 validation；无 direct consumer 时删除 kin-openapi；Service/Model 无 Huma 类型 |
| OBS-057-001 | D | 用官方 otelhttp 替换手工 HTTP instrumentation 并对齐 OTel v1.45 | HTTP-057-002、R013、整体计划已确认 | 已确认 | 单一 server span；TraceContext/semconv/status 由 otelhttp；lease/operation/Prometheus/trace ID/processor lifecycle 保留；secret path/query 不泄漏；modules/race/vuln 门禁通过 |
| DATA-057-001 | E | 建立 GORM session bridge，迁移 Todo 与 Navigation concrete repository | R010、用户于 2026-08-22 确认剩余整体计划 | 已确认 | session 不可逃逸 Borrow/Tx lifetime；CRUD/page/order/not-found/version conflict 三方言 contract 通过；业务 port 不变 |
| DATA-057-002 | E | 迁移 IAM 与 Organization concrete repository/Unit | DATA-057-001、整体计划已确认 | 已确认 | multi-repository transaction、unique/FK、session revoke、catalog reconcile、optimistic update 与三方言通过；migration 不改写 |
| DATA-057-003 | E | 删除反射式 generic Repository/Schema/Query | DATA-057-002、整体计划已确认 | 已确认 | 删除 BaseRepository、Schema/Field/Index/Reference、Query/Filter/Order/Page/Changes、dynamic model 及旧测试；无 AutoMigrate/兼容层/GORM 业务泄漏 |
| ARCH-057-001 | 文档 | 建立 owner/reload 矩阵并冻结最小静态 Blueprint 设计 | R011 | 已完成 | 每项 reload 收益、准入、并存、排空与目标 owner 明确；首片不静态化全部 Service |
| ARCH-057-002 | F | 实施启动期 immutable applicationBlueprint | HTTP-057-001 registration 形态冻结，宜在 HTTP-057-002 后；整体计划已确认 | 已确认 | permission/WebUI/policy/contract 只构造一次；Generation 删除重复入口；多 section reload 行为不退化；无 proxy/容器/平行框架 |
| VER-057-001 | 全部 | 执行与每批相匹配的测试、race/vet、生成、文档和安全门禁 | 对应实施任务；整体计划已确认 | 已确认 | 所有已执行/未执行项和剩余风险如实记录 |

## 整体实施顺序与确认方式

本次整体方案已冻结，不再要求用户逐项替 Agent 决定技术选型。后续一次明确确认“实施 057 剩余整体计划”即可启动，但执行仍按依赖拆分为可验证提交：

1. `SERDE-057-001`，完成 Huma 前置 YAML 稳定路径；`LIMIT-057-001` 与 `SEC-057-002` 可在同阶段独立完成。
2. `HTTP-057-001` 第一片。只有第一片全部门禁通过才进入 `HTTP-057-002`；失败是材料变化，停止并重新报告。
3. `OBS-057-001` 在 Huma 全量迁移后接入稳定 operation/inventory，避免适配旧 DSL 两次。
4. `DATA-057-001` -> `DATA-057-002` -> `DATA-057-003`，每一步必须保持 production 单轨可用，不提交长期新旧双轨。
5. `ARCH-057-002` 在 Huma registration 形态冻结后实施；为减少返工，默认排在 `HTTP-057-002` 后。
6. `VER-057-001` 不是最后补测，而是附着在每个实施任务的定向、全量、race/vet、生成、文档和漏洞门禁。

HTTP 第一片失败、Data 边界泄漏或 Blueprint 无净删除时，不以“技术细节由 Agent 决定”为由越过重新确认门禁。

## 停止与重新确认条件

出现以下任一情况即停止相应批次，回到研究/计划：

- 候选当前 release、许可证、Go 版本或安全状态与 R002 不一致；
- 公共接口、模块边界、HTTP authority、数据迁移、配置语义或外部副作用发生材料变化；
- PoC 需要长期双轨、隐藏回退或新的万能抽象才能接入；
- 架构切片无法证明实际收益，或会删除/破坏用户数据与 migration 历史。

## 整体方案完成证据

| 日期 | 范围 | 结果 |
| --- | --- | --- |
| 2026-08-22 | CONFIG/R008 | koanf v2.3.6、Viper v1.21.0 与当前 strict pipeline 对照完成；选择保留当前边界，不新增 production task |
| 2026-08-22 | HTTP/R009 | Huma v2.39.1 与 ogen v1.24.0 官方源码、release、license、Go 版本与 OSV 核验完成；选择 Huma 分片后单轨迁移 |
| 2026-08-22 | DATA/R010 | GORM Gen v0.3.28、sqlc v1.31.1 与全部真实 repo 查询核验完成；当前无复杂 join，选择 direct GORM concrete repo |
| 2026-08-22 | ARCH/R011 | 完整 Generation 调用链与 section reload 测试复核；owner/reload 矩阵和 `applicationBlueprint` 首片冻结 |
| 2026-08-22 | Security/R012 | rs/cors v1.11.1、unrolled/secure v1.17.0、Go CrossOriginProtection、版本特定 OSV 与当前 IAM/CORS 语义复核；选择 rs/cors + stdlib，保留 IAM token，拒绝 secure wrapper |
| 2026-08-22 | Observability/R013 | otelhttp v0.70.0、OTel v1.45.0、版本特定 OSV 与当前 Telemetry lease/inventory/Prometheus 路径复核；选择官方 HTTP instrumentation |
| 2026-08-22 | PLAN-057-001 文档门禁 | 修订后执行 `Verify-Docs.ps1` 与 `git diff --check`；本轮无源码、依赖、配置、进程、数据库或外部系统变更 |

## 本轮验证证据

| 日期 | 范围 | 结果 |
| --- | --- | --- |
| 2026-08-22 | Git 初始状态 | `main...origin/main [ahead 6]`，工作区初始 clean；未处理用户范围外文件 |
| 2026-08-22 | 当前漏洞扫描尝试 | 未形成有效结果：本机 `govulncheck` 由 Go 1.25 构建，无法加载 Go 1.26.6 项目；列入 SEC-057-001，不冒充通过 |
| 2026-08-22 | 文档验证 | `git diff --check` 通过；`./scripts/Verify-Docs.ps1` 通过，docs-guard 确认当前文档拓扑与适用影响记录有效 |
| 2026-08-22 | 依赖与路径 | 官方最新版本复核为 kin-openapi v0.147.0；`go.mod`/`go.sum` 单轨升级且旧 v0.142.0 残留仅存在于历史研究证据；production 只调用 `ValidateRequest` 并显式提供 `AuthenticationFunc`，不调用 `ValidationHandler`/`ValidateResponse` |
| 2026-08-22 | 安全负向测试 | `go test ./internal/transport/http ./pkg/httpx/contract -count=1` 通过；无 schema `content` 参数返回错误而不 panic，Gate 拒绝后 Handler 未执行 |
| 2026-08-22 | 漏洞扫描工具 | PATH 中 `govulncheck v1.3.0` 已由 Go 1.26.6 重建，`go version -m` 与 `govulncheck -version` 均确认工具链一致 |
| 2026-08-22 | 全仓漏洞扫描 | `govulncheck -show verbose ./...`：0 reachable symbol、0 imported package 漏洞；模块层有 2 个当前不可达项 GO-2026-6222 与 GO-2026-5932，保留为后续研究风险 |
| 2026-08-22 | 完整 Go 门禁 | `Verify-Quality.ps1` 的 gofmt、tidy diff、project layout、generate/clean diff、全量 test、全量 race、vet、CGO-free build 均通过；最后 `Verify-Artifacts` 仅命中既有且被当前范围排除的 `old-backend/` 两个 tracked app.db，与 053/054 已记录阻塞相同，本任务未修改或删除 |
| 2026-08-22 | CACHE-057-001 确认前深化研究 | 非测试 production 搜索没有 typed cache 消费者；现有 L1 无容量上界、跨实例失效和一致错误分类。官方刷新确认 go-cache 最新 release 仍为 2017 年；Otter v2.3.0、ttlcache v3.4.1、Ristretto v2.4.2 具候选资格但当前无引入收益。计划修订后继续待确认，未修改缓存代码或依赖 |
| 2026-08-22 | CACHE-057-001 实施 | 用户确认修订后任务；删除 go-cache、L1、本地 tag map、cleanup goroutine/配置和 typed Client `Close`，Redis 成为唯一 authority；`GetOrLoad`/`GetMany` 仅把 `ErrNotFound` 作为 miss，定向与完整门禁结果见本任务最终验证记录 |
| 2026-08-22 | CACHE-057-001 定向验证 | `go test ./pkg/cache/... ./internal/kernel/app/cache ./internal/kernel/composition -count=1`、`Verify-Docs.ps1` 与 `git diff --check` 通过 |
| 2026-08-22 | CACHE-057-001 完整质量门禁 | `Verify-Quality.ps1` 的 gofmt、tidy diff、project layout、generate/clean diff、全量 test、全量 race、vet、CGO-free build 均通过；最终 `Verify-Artifacts` 仍仅命中范围外 `old-backend/` 两个既有 tracked app.db，本任务未修改或删除 |
| 2026-08-22 | CACHE-057-001 漏洞扫描 | `govulncheck -show verbose ./...`：0 reachable symbol、0 imported package 漏洞；模块层仍为 2 个当前不可达项 GO-2026-6222 与 GO-2026-5932 |
| 2026-08-22 | SERDE-057-001 确认前深化研究 | v4 当前仅有 v4.0.0-rc.6；官方稳定 v3.0.5 活跃安全维护。项目 YAML 只在 config/i18n/contract/tooling 边界，pkg/codec 无消费者。任务修订为稳定 v3 import 迁移 + Codec 退役，继续待确认；未修改源码或依赖 |
| 2026-08-22 | SERDE-057-001 实施 | 用户确认剩余整体计划后，把主模块 config/i18n/HTTP contract/docs-guard 的直接 import 单轨迁移至 `go.yaml.in/yaml/v3 v3.0.5`；删除零消费者 `pkg/codec` 及能力索引入口，不引入 v4 RC，不修改独立且被当前范围排除的 `old-backend` |
| 2026-08-22 | SERDE 定向、全仓与生成门禁 | config/i18n/HTTP contract/docs-guard 定向测试、`go test ./... -count=1`、`go test -race ./... -count=1`、`Verify-Docs.ps1`、gofmt/tidy diff、project layout、generate/clean diff、vet、CGO-free build 与 `git diff --check` 均通过；`Verify-Quality.ps1` 最终仍只因范围外 `old-backend` 两个既有 tracked app.db 返回失败，本任务未修改或删除 |
| 2026-08-22 | SERDE 漏洞与依赖门禁 | `govulncheck -show verbose ./...` 为 0 reachable、0 imported-package 漏洞，module 层仍只有不可达 GO-2026-6222/5932；主模块 direct YAML dependency 仅为 `go.yaml.in/yaml/v3 v3.0.5`，`gopkg.in/yaml.v3` 只经测试依赖留在 module graph/go.sum，不再由项目代码直接 import |
| 2026-08-22 | LIMIT-057-001 确认前深化研究 | 当前 token bucket 自研通用算法且 0/0 实际回落 100/200 默认值；官方 x/time/rate v0.15.0 适配 fail-fast Allow。channel semaphore 精确表达非阻塞 503，保留优于机械换 x/sync。任务增加 local/disabled 严格模式并明确 generation-local，继续待确认；未修改源码、配置或依赖 |
| 2026-08-22 | AUTHN-057-001 确认前深化研究 | jwx/v4 仍强制全项目 `GOEXPERIMENT=jsonv2`，上游暂不建议新代码采用，v3 继续常规修复；Argon2 高层候选不能同时证明成熟主流与敌对 PHC 资源上限。任务修订为保留 jwx/v3 与官方 x/crypto/argon2，补取消、受限 PHC、NeedsRehash 和事务内渐进迁移，继续待确认；未修改源码或依赖 |
| 2026-08-22 | AUTHN-057-001 实施 | 用户确认修订后任务；JWT 未知 key 共享刷新从攻击者可控 kid 分组收敛为 JWKS resource 全局合并，请求取消/刷新 timeout 完整向上；密码 port 改为项目 verification result + error，PHC 在 Argon2 前做 canonical/version/19–64 MiB/2–3 次/p1–4/salt/digest/总长门禁，成功登录事务内渐进重哈希 |
| 2026-08-22 | AUTHN 定向与 race | `go test` 与 `go test -race` 覆盖 auth/iam Adapter、Service、binding 和 composition；claims/time/algorithm/key/malformed/multisig/duplicate kid/并发随机未知 kid/cancel/timeout、PHC/mismatch/资源预算/rehash/低敏错误均通过 |
| 2026-08-22 | Argon2 本机成本证据 | Windows amd64、AMD Ryzen 7 7735HS、`-benchtime=1x`：Hash 约 55.1 ms/64 MiB，Verify 约 59.5 ms/64 MiB；仅作为当前机器起点，不冒充部署 SLO |
| 2026-08-22 | AUTHN 完整质量门禁 | `Verify-Quality.ps1` 的 gofmt、tidy diff、project layout、generate/clean diff、全量 test、全量 race、vet、CGO-free build 均通过；最终 `Verify-Artifacts` 仍只命中范围外 `old-backend/` 两个既有 tracked app.db，本任务未修改或删除 |
| 2026-08-22 | AUTHN 漏洞与依赖复核 | `govulncheck -show verbose ./...`：0 reachable、0 imported-package 漏洞；模块层仍为不可达 GO-2026-6222/5932。jwx/v3 v3.2.0 仍为 v3 最新；x/crypto v0.55 会连带直接 x/text 且不能消除 OpenPGP 记录，当前 Argon2 无可达风险，故不混入无收益升级 |
| 2026-08-22 | RESIL-057-001 确认前深化研究 | 当前 HTTP Client 无 production 构造却会对非幂等方法隐式重试；pkg/resilience breaker 无消费者；Execution production 的 primary/local 均为 MemoryStore，恢复与异步状态机没有真实外部资源。官方刷新确认 backoff/v7 v7.0.0 为当前窄重试候选，failsafe-go v0.9.7 仍为 pre-v1 且范围/依赖过宽，gobreaker/v2 v2.4.0 无当前 failure domain。计划材料性修订并继续待确认；未修改源码、配置或依赖 |
| 2026-08-22 | RESIL-057-001 实施确认 | 用户明确“确认实施，如果是技术选择，则由你确认”；修订计划进入已确认状态，技术细节按 R007 证据与本任务验收边界决策 |
| 2026-08-22 | RESIL-057-001 实施 | 引入 `backoff/v7 v7.0.0` 并隐藏在 `pkg/execution`；项目策略明确 attempts/delay/jitter/attempt+total timeout，记录实际 attempts，低敏 observer 仅输出稳定字段；HTTP Client 删除所有隐式重试配置与循环；删除 `pkg/resilience`、RecoveringStore、AsyncRecorder、Recovery API/配置和相关 goroutine，Messaging 保持单次 attempt |
| 2026-08-22 | RESIL 定向与全仓测试 | execution/httpx/Kernel Execution/Messaging/Schedule/Todo 定向测试通过；`go test ./... -count=1` 全部通过；status 与 transport failure 都验证只发送一次，不可重试/cancel/deadline/exhausted/budget/observer/幂等语义均有测试 |
| 2026-08-22 | RESIL 完整质量门禁 | `Verify-Quality.ps1` 的 gofmt、tidy diff、project layout、generate/clean diff、全量 test、全量 race、vet、CGO-free build 均通过；最终 `Verify-Artifacts` 仍只命中范围外 `old-backend/` 两个既有 tracked app.db，本任务未修改或删除 |
| 2026-08-22 | RESIL 文档与漏洞门禁 | `Verify-Docs.ps1` 与 `git diff --check` 通过；`govulncheck -show verbose ./...` 为 0 reachable、0 imported-package 漏洞，模块层仍仅有不可达 GO-2026-6222/5932；v7 与 OTLP 间接 v5 为不同 import major，职责互不泄漏 |

## Commit

- 研究与计划：`b8445d1 docs(architecture): establish technology selection baseline`
- Batch A：`32a4987 fix(http): upgrade OpenAPI validator security baseline`
- CACHE-057-001：本轮 Conventional Commit（以 Git 历史为准）
- AUTHN-057-001：本轮 Conventional Commit（以 Git 历史为准）
- RESIL-057-001：本轮 Conventional Commit（以 Git 历史为准）
- PLAN-057-001：本轮 Conventional Commit（以 Git 历史为准）
- SERDE-057-001：本轮 Conventional Commit（以 Git 历史为准）
