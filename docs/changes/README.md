# 任务级变更记录

每项新变更使用递增三位序号和语义名称，固定包含 `README.md`、`research/`、`requirements.md`、`design.md` 和 `tasks.md`。所有任务先通过研究门禁，再形成计划；非纯文档实现必须在计划报告后的独立消息中获得确认。完整规则以根 [AGENTS.md](../../AGENTS.md) 为准。

001–041 是随当前仓库导入的脚手架基线档案，保留作为历史证据；042 起是本仓库原生变更记录。两者都不能替代当前主题 authority，当前边界和来源见[脚手架基线来源](../scaffold-baseline.md)。

## 记录

- [001 默认配置契约与可选 CLI](001-default-config-cli-contracts/README.md)：已完成。
- [002 应用启动入口](002-application-entrypoint/README.md)：实现已保留，存在确认流程偏差，最终运行验证未完成。
- [003 变更确认流程](003-change-confirmation-workflow/README.md)：已完成。
- [004 Logger Capability 注入](004-logger-capability-injection/README.md)：已完成。
- [005 全量配置示例](005-full-config-example/README.md)：已完成。
- [006 Kernel App 多态装配基础](006-kernel-app-polymorphic-composition/README.md)：已完成。
- [007 Kernel 内置 Logger 的可选 App 替换](007-app-component-logger-injection/README.md)：已完成。
- [009 配置重载与生命周期修复](009-config-reload-lifecycle-repair/README.md)：已完成。
- [010 数据库单轨 GORM 与稳定访问边界](010-database-gorm-boundary/README.md)：已完成。
- [011 Cache、I18n 与 Storage 装配](011-cache-i18n-storage-composition/README.md)：已完成。
- [012 业务模块架构](012-business-module-architecture/README.md)：底层 CLI/Config/单候选/Supervisor/HTTP/诊断与治理闭环已实施；业务解锁条件已由 014 的真实 Todo 用例满足。
- [013 研究优先任务门禁](013-research-plan-implementation-gate/README.md)：已完成；将 012 的结构化研究方法提升为“研究 -> 计划 -> 实现”的仓库级前置门禁。
- [014 Todo 业务垂直切片](014-todo-business-vertical-slice/README.md)：已实现 Todo Model/Service/Repository、SQLite migration、HTTP 路由、Application CLI、配置绑定与进程组合闭环。
- [015 Todo 路由中间件示例](015-todo-route-middleware-example/README.md)：已实现模块级 JSON Content-Type middleware、创建路由显式绑定、415 安全错误与进程验收。
- [016 应用模块命名迁移](016-application-module-naming/README.md)：已完成；`internal/module`、`module.ID` 与 `module.todo` 已成为唯一现行命名。
- [017 应用模块能力评估门禁](017-module-capability-assessment-gate/README.md)：已完成通用 Agent 研究语境、项目级应用模块开发指南、能力评估表和生命周期契约缺口升级路径。
- [018 Cordis 启发的插件架构](018-cordis-inspired-plugin-architecture/README.md)：已废除；研究快照作为历史保留，所有插件架构实施任务失效。
- [019 HTTP API 成熟度缺口评估](019-http-api-maturity-gap-assessment/README.md)：已完成当前 HTTP API 运行链审计、成熟度参考、缺口优先级和分阶段路线；没有非文档实施授权。
- [020 复制型脚手架产品形态](020-scaffold-product-form/README.md)：已完成 copy-owned 单轨决策、两个独立副本的身份迁移、Todo 保留/移除和 Windows 门禁；Linux、正式复制指南与 release 能力仍待独立实施。
- [021 仓库身份迁移](021-repository-identity-migration/README.md)：已将 canonical remote、Go module/import、运行品牌与当前使用文档统一为 `go-scaffold-template`；另一个 `go-scaffold` 仓库未进入范围。
- [022 HTTP API 脚手架成熟就绪度](022-http-api-template-readiness/README.md)：`Foundation-closed(current synchronous HTTP/CLI profile)` 已通过；024 已完成产品能力与 Windows 本地证据，但 Linux、容器、服务器数据库和远端 CI 总验收尚未通过。
- [023 全配置无感重载](023-full-configuration-seamless-reload/README.md)：已完成本地实施验收；Application Generation/ListenerHub 与七节配置重载已落地，Linux 真实 runtime 和真实 Redis 经用户批准跳过并保持未验证，未 push。
- [024 生产就绪模板一次性竣工](024-production-ready-one-shot-completion/README.md)：已确认并实施中；连续完成 `ONE-001..025` 与本地检查点提交，禁止 push、tag、远端 Release、GHCR 和外部 attestation。
- [025 业务模块边界收口](025-business-module-boundary-closure/README.md)：已完成；Todo 手写 HTTP Adapter 已收回模块，Auth/Todo 通过窄端口连接，入口与跨模块导入门禁已加固，OpenAPI 与运行行为保持不变。
- [026 Handler-first HTTP 路由绑定](026-handler-first-http-route-binding/README.md)：研究与计划已完成，待确认；拟把模块 operation Handler、应用静态 aggregate、单一生成 route binding 与外层 Router 分责，消除当前单模块假设。
- [027 第三方封装与分轨装配](027-business-module-third-party-isolation/README.md)：已确认并实施；新增业务能力先完整收口到模块，专属第三方留在模块 Adapter 并零泄漏，只有跨业务复用且由进程统一选择的资源才进入完整底层链。
- [028 开发日志基线与启动可见性](028-required-development-logging/README.md)：已完成；development 默认输出 Debug 及以上，production 默认保持 Info，Service/Generation/HTTP 已形成分级低敏事件链并由开发规范和架构测试守护。
- [029 本地启动与配置闭环](029-local-startup-config-closure/README.md)：已完成；generated config、Migration、Todo CLI 与 Service 共用 application-owned 配置集合，本地启动与配置说明已收束到根 README、本地启动指南和配置说明。
- [030 模块自有代码优先契约](030-module-owned-code-first-contract/README.md)：已完成；契约 authority 反转为模块自有 typed 声明，`contract-gen` 从代码生成 `api/openapi.yaml` 与 operation inventory，删除 oapi-codegen 生成链与 nethttp-middleware，transport 从同一份契约单一绑定。
- [031 模块顶层 HTTP Handler 分责](031-module-top-level-http-handler/README.md)：已完成；Todo 的 HTTP handler 层从 `binding/http` 迁移到模块顶层 `handler`，`binding/http` 只做代码优先契约与运行期装箱，每层职责分明。
- [032 i18n 配置职责边界与集中声明](032-i18n-config-boundary/README.md)：已完成；`kernel/app/i18n` 集中声明默认配置并统一 `./locales`，logger/database 组件自声明默认值（不再复用 `pkg/*.DefaultConfig()`），cache 的 `redisstore.DefaultTagPrefix` 作为基础默认常量回退保留，并把「应用层不得隐式依赖通用库默认值」纳入架构门禁与业务 i18n 接入文档。
- [033 业务模块统一契约与 binding 对齐](033-module-contract-alignment/README.md)：已完成；把统一绑定契约（HTTP/config/cli/migration/i18n/middleware）固化到模块开发指南，落地业务流程模块自有 i18n binding（Todo `binding/i18n`），文档化 Ops（独立 management）/Auth（横切）/Migration（纯 CLI）形态，并保留 032 的 pkg/kernel-app 配置边界。
- [034 业务模块装配纯度与文档一致性](034-module-wiring-purity/README.md)：已完成；`internal/composition` 通过 `applicationHTTPModules()` 收敛 HTTP 契约接入，消除 `ops.go`/`service.go` 对 `todohttp.ModuleContract()` 的直接反向读取，生成器注册点 `registeredModules()` 与装配流程文档化，并让权威文档与实现一致。
- [035 后台任务能力装配（幂等 / 重试 / 执行记录）](035-background-task-capabilities/README.md)：已完成；为需要幂等、失败重试、执行记录的业务模块（订单、支付、库存为例）装配 `pkg/execution -> kernel/app/execution -> composition` 底层执行能力（默认内存 backend + 组件开关），重试复用 `pkg/resilience`（`d42e044`）；并在 `pkg/execution` 追加外部依赖故障恢复治理 `RecoveringStore`（Healthy/Degraded/Recovering 状态机、有界记录缓冲 + 溢出策略、退避/抖动/最大频率探测、可用性验证、恢复后回放并原子切回主实现）与执行记录异步持久化 `AsyncRecorder`，`kernel/app/execution` 装配恢复治理 + 异步记录、按 `Config.Policies`/`Execution.PolicyName` 提供命令式按模块策略隔离，并经注入 Logger 输出状态变化日志、`Access.Recovery()`/`Access.Health()` 导出恢复治理观测；缓存 Cache-primary/数据库外部主存储接入列为下一增量。
- [036 业务模块接入 execution（Todo 落地）](036-business-module-execution-adoption/README.md)：接入指南（纯文档）已完成；为需要幂等、失败重试、执行记录的业务模块沉淀单一权威入口 `docs/development/execution-capability.md`（声明式命名策略、`OperationExecutor` 用法、错误语义、Trace、观测与多实例边界，并由模块开发指南索引）；非文档的 Todo 真实接入（service 窄 port + composition 注入 + 命名策略）待计划确认。
- [037 定时调度能力](037-scheduled-task-capability/README.md)：已确认并实施；模块通过显式 Schedule Binding 声明 cron/fixedDelay 与任务策略，Application Generation 统一治理触发、并发、Execution/Tracing、Ops 与基于 Cache Redis owner 的分布式执行权，严格任务不隐式本地降级并可在协调恢复后自动重新参与。
- [038 消息系统适配能力](038-messaging-adapter-capability/README.md)：已实现项目自有 Message Contract/Binding、显式多 Provider、RabbitMQ Adapter、Execution 可靠性协作与 Application Generation Consumer admission；本地工程门禁通过，RabbitMQ 4.3 真实协议门禁因本机无 Docker/WSL 保持未验证。
- [039 文档体系闭环整理](039-documentation-system-closure/README.md)：已完成；根 README、项目手册总目录、开发入口、架构入口和运维入口按项目生命周期形成闭环，并明确当前主题文档、研究快照与任务证据的 authority 边界。
- [040 项目文档体系系统重构](040-documentation-system-rebuild/README.md)：已完成；系统审计正式与历史文档、建立审计矩阵，按真实使用路径重构项目手册和 architecture/development/operations 入口，补齐 `pkg/execution` 局部说明，并修正 Kernel 局部 README 的过期阶段边界。
- [041 日志体系补齐与治理](041-logging-observability-governance/README.md)：已完成；在既有 Logger、Tracing、Execution Record、Health、Diagnostics 与 Observability 能力上补齐 migration、execution、messaging、management、scheduler 的低敏结构化日志、测试门禁和开发规范，避免重复建设平行观测体系。
- [042 Admin WebUI 模块化宿主](042-admin-webui-foundation/README.md)：保留为历史实施证据；项目自有 Admin 技术命名已由 043 单轨取代。
- [043 WebUI 契约命名单轨迁移](043-webui-contract-naming/README.md)：已完成；文件夹、契约、路由、CLI、Session、数据库对象和前端标识统一为 `webui`。
- [044 WebUI 本地启动闭环](044-webui-local-startup-closure/README.md)：已完成路由 prefix 与本地 HTTPS 修复；旧路径记录仅为历史证据。
- [045 WebUI Origin 策略闭环](045-webui-origin-policy/README.md)：已完成 CORS、Auth Origin、Vite 本地配置和 Setup Token 输入遮罩修复。
- [046 WebUI Setup 输入校验错误闭环](046-webui-setup-validation-errors/README.md)：已把用户名/密码输入错误从 500 收敛为稳定 400，并补齐页面约束、中文提示和前端测试。
- [047 Admin WebUI 产品化与模块化装配闭环](047-admin-webui-productization/README.md)：已停止继续实施；已提交代码作为当前事实和历史证据保留，未完成路线由 048 取代。
- [048 业务模块自有 WebUI 与通用 SDK 重构](048-full-stack-webui-modules/README.md)：已完成 SDK、模块边界、Binding/生成门禁、CSS Modules、资源加载隔离与 E2E/视觉验收；页面继续由 `internal/module/<id>` 持有，普通模块 core 零修改，只有真实新宿主能力才单独增加 SDK interface/adapter。
- [049 项目规范门禁语境核验](049-project-rule-gate-context/README.md)：已完成；核验模块、配置、日志、WebUI、质量、发布与许可证规范的真实覆盖，修复“命令通过但目标未被扫描”和“Go 门禁冒充全项目门禁”的项目文档语境。
- [050 项目门禁缺口实施](050-project-gate-implementation/README.md)：已确认并实施；WebUI 门禁改为动态发现模块，静态质量链接入本地脚本、CI 与 release，容器许可证标签与源码声明对齐。
- [051 项目文档体系治理闭环](051-documentation-system-governance-closure/README.md)：已确认并实施；系统修复当前文档入口、范围、使用路径、模块/能力索引、历史污染与缺失说明，并建立文档影响记录、跨平台门禁和 CI 约束；`old-backend/` 明确排除。
- [052 项目布局与可配置值集中声明](052-declarative-project-layout/README.md)：研究门禁已通过，计划待确认；拟集中声明 WebUI/模块 facet、生成物、工具/release 路径与开发 endpoint，并审计其他可配置化候选。
- [053 Admin 多业务模块基础平台](053-admin-module-foundation/README.md)：已完成；定向补齐 Permission、Migration、HTTP/Auth 与 WebUI NavigationPolicy 聚合契约，不实施 Admin 业务功能。
- [054 IAM 身份与访问管理模块](054-iam/README.md)：已完成；单轨接管本地账号/凭据/Session，并实现 Core RBAC、owner、用户/角色/权限 API 与 WebUI。
- [055 Organization 组织目录模块](055-organization/README.md)：已完成；拥有部门、岗位和账号组织关系，不包含部门数据权限。
- [056 Navigation 后台导航策略模块](056-navigation/README.md)：已完成；管理已注册菜单的启停、父子、排序和 NavigationRevision，不建立动态页面或第二套授权。
- [057 通用技术与承载架构重新审视](057-technology-and-architecture-reassessment/README.md)：研究门禁与纯文档规则/authority 更新已完成；Batch A 已把 kin-openapi 升级到 v0.147.0、补齐请求验证安全回归并重建 Go 1.26 漏洞扫描证据，Batch B–E 仍待逐项确认。
- [058 Casbin RBAC 注入与授权边界重构](058-casbin-rbac-integration/README.md)：已确认，实施中（001–009 已完成）；Casbin v3.10.0 以 IAM module-owned evaluator 单轨接管 Core RBAC 求值，Auth 经消费方 DecisionPoint 消费，authorization revision + 不可变 snapshot 保证 fail closed，动态分配升级为 expected version/409/Catalog 矩阵，`permissionsFor`/IAM-Scopes/HasScope 旧路径已删除。
- [059 WebUI 后台骨架与交互体验升级](059-webui-shell-experience-upgrade/README.md)：已确认，实施中；统一 Shell 视觉区域、动效与 reduced-motion 决策、Shell/Page/Data skeleton、overlay 进退场，页面由各模块 owner 校准，退役零消费者 HeroUI，不引入 Tailwind/动画库，静态可插拔与按路由 code splitting 保持。

下一个任务序号为 `060`。已完成记录只保存历史证据；当前行为必须回到根 [README](../../README.md) 和对应主题文档确认。
