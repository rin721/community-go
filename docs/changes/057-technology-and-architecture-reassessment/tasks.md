# 057 任务与证据

## 当前状态

- 研究门禁：已通过。
- 文档任务：已完成，适用纯文档直接实施例外。
- 非文档任务：用户已于 2026-08-22 明确确认并完成 Batch A（`SEC-057-001`）及修订后的 `CACHE-057-001`、`AUTHN-057-001`；其余任务仍待确认。

## 任务清单

| ID | 批次 | 任务 | 依赖 | 状态 | 完成条件 |
| --- | --- | --- | --- | --- | --- |
| RES-057-001 | 文档 | 审计当前能力、依赖、调用方与承载架构 | 无 | 已完成 | R001 可复核，事实/推断/目标分离 |
| RES-057-002 | 文档 | 以官方来源核验成熟候选、维护与安全状态 | RES-057-001 | 已完成 | R002 有版本日期、适用边界、局限和刷新触发器 |
| DOC-057-001 | 文档 | 更新 AGENTS、研究规范、模块指南、pkg/architecture authority 和导航 | RES-057-001, RES-057-002 | 已完成 | 技术决策基线单一可发现，文档门禁通过 |
| SEC-057-001 | A | 升级 kin-openapi 并重建 Go 1.26 漏洞扫描证据 | 用户确认 Batch A | 已完成 | v0.147.0、生成/请求负向测试、全仓 govulncheck 和旧版本残留搜索通过 |
| CACHE-057-001 | B | 单轨退役默认 L1 与 go-cache，收紧 Redis typed cache 的 miss/error 语义 | 用户于 2026-08-22 确认修订后的该任务 | 已完成 | 删除本地状态/goroutine/专属配置和 go-cache；Redis typed cache/tag/disabled/cancel/error 语义测试通过；不新增 L1 依赖 |
| SERDE-057-001 | B | 迁移官方稳定 YAML v3 路径并退役无消费者 Codec | 用户确认修订后的该任务 | 待确认 | project direct import 使用 go.yaml.in/yaml/v3 v3.0.5；删除 gopkg direct requirement 与 pkg/codec；config/i18n/OpenAPI/docs fixture 和完整门禁通过；不直引 v4 RC |
| LIMIT-057-001 | B | 用 x/time/rate 替换通用 token bucket，修正入口保护配置语义 | 用户确认修订后的该任务 | 待确认 | x/time/rate v0.15.0 隐藏在项目薄边界；删除自研 refill/lock；增加 local/disabled 严格模式；保留 generation-local 与 channel 503；mode/burst/refill/concurrency/CORS/management/reload、完整 Go 与漏洞门禁通过；不增加主体或分布式 quota |
| AUTHN-057-001 | B | 保留 jwx/v3 与 x/crypto/argon2，补 JWT 取消/负向矩阵和受限 PHC/NeedsRehash/渐进重哈希 | 用户于 2026-08-22 确认修订后的该任务 | 已完成 | 第三方类型不泄漏；取消原因保留；敌对 PHC 在 Argon2 前拒绝；登录事务重哈希与完整安全门禁通过；不引入 jwx/v4、OIDC 或小众 Wrapper |
| RESIL-057-001 | C | 以 backoff/v7 收敛 Execution retry，并退役无依据的 HTTP/recovery/breaker 状态 | 用户确认修订后的该任务 | 待确认 | backoff/v7 隐藏在 Execution 内部；profile 明确 attempts/jitter/attempt+total budget；HTTP one-shot；删除 pkg/resilience、RecoveringStore、AsyncRecorder 及旧配置/API；Todo/Schedule/Messaging 语义和完整门禁通过 |
| HTTP-057-001 | D | 用真实 operation 比较 Huma v2 与当前 typed DSL | Batch A 完成、用户确认该任务 | 待确认 | 生成、验证、鉴权/政策扩展、错误与迁移成本有可运行证据；只输出采用或拒绝结论 |
| DATA-057-001 | D | 用真实复杂查询比较当前 Repository、GORM Gen 与 sqlc | 用户确认该任务 | 待确认 | 三方言、事务、分页、乐观锁、错误、测试与迁移成本可复核；模块 port 不变 |
| CONFIG-057-001 | D | 比较 koanf 与当前 parser/provider 范围 | 用户确认该任务 | 待确认 | 明确可删除自研范围；strict candidate/owner/reload 语义不丢失 |
| ARCH-057-001 | E | 建立 owner/reload 矩阵并设计最小静态对象图切片 | 前置 PoC 结论、用户确认设计 | 待确认 | 每项 reload 收益/并存/排空/回滚明确，更新计划后再次报告 |
| ARCH-057-002 | E | 实施一个静态/动态平面分工切片 | ARCH-057-001 后再次确认 | 待确认 | 行为不退化，构造/状态/停止复杂度有证据改善，无平行框架或兼容层 |
| VER-057-001 | 全部 | 执行与每批相匹配的测试、race/vet、生成、文档和安全门禁 | 对应实施任务 | 待确认 | 所有已执行/未执行项和剩余风险如实记录 |

## 建议确认方式

Batch A、修订后的 `CACHE-057-001` 与 `AUTHN-057-001` 已完成。R004、R005、R007 已分别材料性修订 `SERDE-057-001`、`LIMIT-057-001`、`RESIL-057-001`；此前确认不覆盖这些任务。下一轮可分别确认任一修订后的待确认任务 ID。Batch D/E 应依据前序证据重新提交更窄设计。

## 停止与重新确认条件

出现以下任一情况即停止相应批次，回到研究/计划：

- 候选当前 release、许可证、Go 版本或安全状态与 R002 不一致；
- 公共接口、模块边界、HTTP authority、数据迁移、配置语义或外部副作用发生材料变化；
- PoC 需要长期双轨、隐藏回退或新的万能抽象才能接入；
- 架构切片无法证明实际收益，或会删除/破坏用户数据与 migration 历史。

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
| 2026-08-22 | LIMIT-057-001 确认前深化研究 | 当前 token bucket 自研通用算法且 0/0 实际回落 100/200 默认值；官方 x/time/rate v0.15.0 适配 fail-fast Allow。channel semaphore 精确表达非阻塞 503，保留优于机械换 x/sync。任务增加 local/disabled 严格模式并明确 generation-local，继续待确认；未修改源码、配置或依赖 |
| 2026-08-22 | AUTHN-057-001 确认前深化研究 | jwx/v4 仍强制全项目 `GOEXPERIMENT=jsonv2`，上游暂不建议新代码采用，v3 继续常规修复；Argon2 高层候选不能同时证明成熟主流与敌对 PHC 资源上限。任务修订为保留 jwx/v3 与官方 x/crypto/argon2，补取消、受限 PHC、NeedsRehash 和事务内渐进迁移，继续待确认；未修改源码或依赖 |
| 2026-08-22 | AUTHN-057-001 实施 | 用户确认修订后任务；JWT 未知 key 共享刷新从攻击者可控 kid 分组收敛为 JWKS resource 全局合并，请求取消/刷新 timeout 完整向上；密码 port 改为项目 verification result + error，PHC 在 Argon2 前做 canonical/version/19–64 MiB/2–3 次/p1–4/salt/digest/总长门禁，成功登录事务内渐进重哈希 |
| 2026-08-22 | AUTHN 定向与 race | `go test` 与 `go test -race` 覆盖 auth/iam Adapter、Service、binding 和 composition；claims/time/algorithm/key/malformed/multisig/duplicate kid/并发随机未知 kid/cancel/timeout、PHC/mismatch/资源预算/rehash/低敏错误均通过 |
| 2026-08-22 | Argon2 本机成本证据 | Windows amd64、AMD Ryzen 7 7735HS、`-benchtime=1x`：Hash 约 55.1 ms/64 MiB，Verify 约 59.5 ms/64 MiB；仅作为当前机器起点，不冒充部署 SLO |
| 2026-08-22 | AUTHN 完整质量门禁 | `Verify-Quality.ps1` 的 gofmt、tidy diff、project layout、generate/clean diff、全量 test、全量 race、vet、CGO-free build 均通过；最终 `Verify-Artifacts` 仍只命中范围外 `old-backend/` 两个既有 tracked app.db，本任务未修改或删除 |
| 2026-08-22 | AUTHN 漏洞与依赖复核 | `govulncheck -show verbose ./...`：0 reachable、0 imported-package 漏洞；模块层仍为不可达 GO-2026-6222/5932。jwx/v3 v3.2.0 仍为 v3 最新；x/crypto v0.55 会连带直接 x/text 且不能消除 OpenPGP 记录，当前 Argon2 无可达风险，故不混入无收益升级 |
| 2026-08-22 | RESIL-057-001 确认前深化研究 | 当前 HTTP Client 无 production 构造却会对非幂等方法隐式重试；pkg/resilience breaker 无消费者；Execution production 的 primary/local 均为 MemoryStore，恢复与异步状态机没有真实外部资源。官方刷新确认 backoff/v7 v7.0.0 为当前窄重试候选，failsafe-go v0.9.7 仍为 pre-v1 且范围/依赖过宽，gobreaker/v2 v2.4.0 无当前 failure domain。计划材料性修订并继续待确认；未修改源码、配置或依赖 |

## Commit

- 研究与计划：`b8445d1 docs(architecture): establish technology selection baseline`
- Batch A：`32a4987 fix(http): upgrade OpenAPI validator security baseline`
- CACHE-057-001：本轮 Conventional Commit（以 Git 历史为准）
- AUTHN-057-001：本轮 Conventional Commit（以 Git 历史为准）
