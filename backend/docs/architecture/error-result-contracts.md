# 错误与结果契约

本项目后端 API 使用统一 `Result` 响应结构，前端通过统一 API client 归一化请求结果和错误。底层工具库、基础设施包和模块私有 helper 不得吞掉错误；如果确实是 best-effort 行为，必须在调用点用注释、命名或文档说明其业务影响。

## 后端响应结构

统一响应结构位于 `types/result`：

- `code`：跨层可识别的错误码，成功为 `0`。
- `messageKey`：i18n 文案键，禁止用裸字符串表达用户可见错误。
- `message`：根据请求 locale 本地化后的展示文案。
- `messageArgs`：字段名、限制值等插值参数。
- `traceId`：请求追踪 ID，用于排查服务端日志。
- `serverTime`：服务端响应 Unix 秒时间戳。

错误码位于 `types/errors`，只表达平台级跨层契约。模块内部错误应先留在模块 service 内，再由 handler 映射为统一响应。

`types/errors` 不承载用户、角色、菜单、公告等具体模块私有错误码。需要表达具体字段或资源时，使用稳定 `messageKey` 和 `messageArgs`，不要把模块语义扩散到全局错误码常量。

## Handler 规则

- Handler 只做输入输出适配，不写业务规则。
- 参数解析失败必须返回稳定 i18n key，例如 `validation.common.invalidNumber`，并通过 `messageArgs.field` 保留字段上下文。
- 服务层错误由 handler 统一映射到 `result.BadRequest`、`result.Unauthorized`、`result.Forbidden`、`result.NotFound` 或 `result.InternalError`。
- 未知错误必须记录日志并返回通用 500，不向用户暴露数据库、缓存、文件系统或第三方服务细节。
- 新增主系统 API 时，响应 DTO 和错误语义必须能被 `internal/transport/http/contracts.go` 描述。

## Service 规则

- Service 返回明确错误，调用方决定 HTTP 状态、重试、降级或提示。
- 权限、审计、事务、通知、缓存刷新等影响业务语义的失败不得静默忽略。
- 对缓存读取、临时文件删除、连接关闭等 best-effort 行为，允许忽略错误，但必须不影响主流程正确性。
- 日志不能替代错误返回；除非行为明确是 best-effort，否则应返回错误。

## `pkg` 与工具库规则

- `pkg` 不依赖业务模块，不替业务层决定响应或降级策略。
- 工具函数解析、读取、写入、网络请求、加密、存储和序列化失败必须返回错误。
- 可恢复的清理动作可以 best-effort，但不得隐藏主操作失败。

显式丢弃错误必须进入可重复检查。当前默认发布前 gate 会运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
```

该脚本扫描 `internal`、`pkg` 和 `types` 的生产 Go 文件中 `_ =` 丢弃错误、关闭、删除、写入、同步、发送或停止等结果的高风险候选。新增忽略行为必须优先改为返回错误或状态；只有不影响主流程正确性的 best-effort 清理、临时监听器关闭、HMAC 写入等情况，才允许在脚本 allowlist 中写明业务影响。

## 前端 API client

前端统一入口位于 `web/app/app/lib/api/client.ts`：

- 所有页面通过 endpoint 表和 API client 发起请求，不散落 `/api/v1` 字符串。
- API client 负责透传 `AbortSignal`、`X-Locale`、产品维度 header、CSRF header 和 cookie 凭据。
- 后端 `Result` 中 `code != 0` 或 HTTP 非 2xx 会转成 `ApiError`。
- `ApiError` 保留 `status`、`code`、`endpoint`、`payload`、`traceId`、`messageKey`、`messageArgs` 和 `serverTime`，页面根据状态处理 401、403、空态和错误态。
- 网络失败会归一为 `ApiError{status: 0, code: "NETWORK_ERROR"}`；主动取消请求的 `AbortError` 保持原样抛出，调用方可以安全忽略。
- 成功响应如果不是可解释的 API JSON，会返回 `NON_JSON_RESPONSE` 或 `INVALID_JSON_RESPONSE`，不得把 HTML fallback 或坏 JSON 当作业务数据。
- 认证刷新只由 API client 统一处理；页面不直接实现 refresh 重试。

## 当前已修正

`internal/modules/iam/service` 的权限策略重载、邮箱验证过期状态保存、用户状态保存、MFA 因子确认、角色权限 hydrate、API Token 列表用户信息补全、API Token 最后使用时间保存、审计日志写入和审计 metadata 序列化失败已经改为向上返回错误。登录、组织更新、邀请、忘记密码、撤销邀请、密码重置、MFA 设置/确认、会话撤销、用户状态/角色更新、API Token 创建/撤销、角色创建/更新等关键路径不再用 `_ = s.audit(...)` 静默吞掉审计失败。

登录、组织更新、撤销邀请、密码重置、MFA 设置/确认、会话撤销、用户状态/角色更新、API Token 创建/撤销、角色创建/更新这类不依赖外部通知投递的本地写操作，已经把主数据写入和审计写入收敛到同一数据库事务；审计失败会回滚本次主数据变更。

邀请创建、忘记密码和邮箱验证注册属于通知型写操作。当前实现会先把一次性 token、审计和 `iam_notification_outbox` 写入同一数据库事务，事务成功后才调用 `Notifier`；审计失败不会触发邮件、短信或其他外部通知，也不会留下可用通知任务。通知投递失败时不会撤销或清理仍可补偿的 pending 资源，而是写回 outbox 尝试次数、下次重试时间或 failed 终态，并向上返回 `ErrNotificationDelivery`，调用方可以据此提示重试或切换通知配置。

`internal/modules/iam/service` 的缓存读取、缓存写入、缓存 epoch 读取、epoch bump 和缓存 key 过滤条件编码仍是可降级路径；缓存失败不会替代数据库事实，也不会阻断组织、用户、角色和权限列表或写操作，但会通过 warn 日志记录缓存 key、scope 和底层错误。

`internal/modules/system/service` 的断点上传会话过期状态保存已经改为向上返回错误。被动发现过期会话时，状态写入成功后才向客户端返回无效输入；状态写入失败会返回存储错误，避免客户端误判为普通参数问题。

`internal/modules/system/service` 的流量探针结果证据会在写入前校验为合法 JSON。runner 返回非法 `EvidenceJSON` 时，service 返回 `ErrInvalidInput`，并且不写入探测结果、目标状态或劫持事件，避免后续 UI 和审计读取到不可解释的证据。

`internal/app/adapters.TrafficProbeRunner` 生成证据 JSON 时如果遇到不可序列化值，会继续返回兼容的 `{}` 证据并写入 warn 日志。该降级只发生在探针适配器内部证据组装阶段，不改变探测主结果；service 层仍负责在持久化前校验 `EvidenceJSON`。

`internal/modules/announcements/service` 的列表查询在仓储缺失或表不存在时返回 `ErrStorageUnavailable`，不再用 `200 + storageStatus=unavailable` 隐藏存储错误。handler 统一映射为 503，前端公告页通过 API error 状态展示“公告存储不可用”说明。

`internal/app/initcenter.Service` 的初始化运行状态、步骤状态和保存配置后的步骤列表读取错误必须向上返回。初始化流程失败时如果记录失败步骤或保存 run 状态也失败，使用 `errors.Join` 同时保留原始初始化错误和状态持久化错误，避免 setup UI 误判初始化状态。

`internal/app/initcenter` 的 setup schema、配置测试和配置保存会为输入生成稳定指纹。指纹编码失败必须向上返回错误，不得用空字节或默认 hash 继续写入步骤状态，避免前端把不可解释的输入当作正常配置快照。

`internal/app/initcenter` 的 `bootstrap_state.json` 是数据库配置变更后提示重启的运行态事实。保存数据库配置时如果发现新旧数据库指纹一致，或服务状态检查发现重启已经生效，清理该文件失败必须返回给调用方；`Run` 汇总初始化结果时读取步骤记录失败也必须返回，不得把缺少步骤事实的报告交给 Web setup 或 CLI。

`internal/app/initcenter.Service.Run` 写入初始化步骤摘要到 stdout 失败时必须返回错误。步骤状态保存成功后才允许输出成功摘要；如果输出失败，CLI 调用方会收到 `write initialization output` 错误，避免脚本或人工操作误判初始化进度已经可靠展示。

`internal/app/cliapp/services/init.ExecuteInitialization` 通过最小应用图复用真实初始化逻辑。初始化主流程结束后，资源关闭失败必须返回给 CLI 调用方；当初始化主流程和关闭都失败时，使用 `errors.Join` 同时保留两类错误。bootstrap 基础设施装配中途失败时，也会清理已经创建的数据库、缓存、执行器或存储资源，并把清理失败合并到原始装配错误中。

`internal/app/cliapp/services/init` 的 `InspectInitializationStatus`、`SetupSchema` 和 `SaveSetupConfig` 使用轻量 bootstrap center 读取或保存初始化状态；调用结束后的数据库关闭失败会通过 `cleanup bootstrap center` 错误返回给 CLI 调用方，如果主操作也失败则使用 `errors.Join` 同时保留主错误和清理错误。`run server` 启动前检查初始化状态失败时，handler 必须返回该错误，不得把它当作“不需要初始化”继续启动。

`internal/app/cliapp/services/init.OfferManagedServerRestartAfterInit` 在初始化成功后检查托管 server 状态失败时必须返回错误，不得只输出提示后吞掉运行态事实；非交互提示、跳过提示和后续命令提示写入 stdout 失败也必须返回给 CLI 调用方。

`pkg/storage` 的文件监听启动失败继续由 `Watch` 直接返回错误；监听启动后的异步后端错误会通过 `WatchEvent{Op: "ERROR", Error: err}` 传给 handler，不再只发送无原因的错误状态事件。

`pkg/storage.NewManager` 在 `local+s3` 或 `local+minio` 组合驱动初始化对象存储失败时，会继续关闭已经创建的本地 client；如果关闭也失败，会使用 `errors.Join` 同时返回对象初始化错误和本地关闭错误。`StorageManager.Close` 会继续尝试关闭本地与对象存储 client，并在最终错误中保留每个底层关闭错误，避免只报告第一个关闭失败而隐藏另一个资源遗留风险。

`pkg/mail.SMTPSender` 的 SMTP deadline 设置、DATA 写入、DATA 关闭确认、TLS 握手、`smtp.NewClient` 初始化、`QUIT` 和失败路径连接关闭错误都会返回给调用方。投递主错误和清理关闭错误同时发生时使用 `errors.Join` 保留两类错误；成功 `QUIT` 后不再重复关闭连接，避免把正常 SMTP 会话结束误报成投递失败。

`pkg/migrator.Runner.Status` 的迁移状态输出 writer 写入失败会返回给调用方。goose logger 回调本身无法返回错误，因此 `pkg/migrator` 会记录 logger 写入失败，并在 goose 操作结束后用 `errors.Join` 合并迁移执行错误与 `write migration output` 错误，避免 CLI 或脚本误判迁移状态输出已经可靠落地。

`pkg/sqlgen.Generator.Migrate` 保留链式 builder API，但模型解析失败会记录到 `MigrateBuilder`，并由 `Build()` 返回给调用方。无效模型不得继续生成空表名 `ALTER TABLE` SQL，避免脚本把不可执行迁移误当作成功产物。

`pkg/rpcserver` 的 JSON-RPC HTTP handler 会返回标准 JSON-RPC 错误对象；响应编码或写入失败发生在 HTTP 状态码写出之后，不能再改写为新的业务响应。此类失败必须通过注入的 logger 记录 `path`、`status` 和底层错误，不得静默吞掉，避免 RPC 响应丢失无运行态证据。

`pkg/database.Reload` 在新连接创建成功但 Ping 失败时，会保持旧连接不变并继续关闭候选连接；如果候选连接关闭也失败，使用 `errors.Join` 同时返回 Ping 失败和候选连接关闭失败，避免热重载调用方只看到验证失败而漏掉连接泄漏风险。

`internal/app/lifecycleapp.Start` 和 `internal/app/initapp.backgroundGroup` 的启动失败回滚会继续关闭已经启动成功的后台任务、HTTP server 或 RPC 相关资源；如果回滚关闭也失败，会用 `errors.Join` 把原始启动错误和回滚错误一起返回给上层。`lifecycleapp.Shutdown` 正式关闭路径也会继续尝试释放后续资源，并在最终错误中保留每个底层关闭错误，避免进程只报告摘要而隐藏资源遗留风险。

`pkg/logger.Sync` 会把 stdout/stderr 在部分平台上的无害 `EINVAL` 归一化为 nil，但文件、轮转器或其他真实 flush 失败必须返回调用方。`lifecycleapp.Shutdown` 会在资源关闭日志写出后执行 `Logger.Sync`，并把非无害 sync 错误合并到最终 shutdown 错误；CLI 的 IAM bootstrap、db 操作和 migration 命令也必须把命令结束前的 logger sync 失败返回给调用方。`pkg/logger.Reload` 在新 logger 已应用后如果旧 logger 同步失败，会返回“重载已应用但旧 logger 同步失败”的状态，热重载调用方可按 best-effort 策略记录和告警。

`internal/app/initapp.NewInfrastructure` 在数据库之后继续装配缓存、执行器和存储。任一后续组件装配失败时，会按反向顺序关闭已经创建的存储、执行器、缓存和数据库资源；如果关闭也失败，使用 `errors.Join` 同时保留原始装配错误和 `cleanup partial infrastructure` 错误，避免启动失败后遗留连接、goroutine pool 或文件监听资源。

`pkg/executor.Manager.Shutdown` 现在返回关闭错误。协程池释放超时会携带池名称返回给调用方；`Reload` 在新池已经替换后如果旧池释放失败，也会返回“旧池释放失败”的状态。`lifecycleapp.Shutdown`、初始化 bootstrap 清理和基础设施部分装配失败回滚都会把 executor 关闭错误并入最终错误，避免 goroutine pool 释放超时只停留在底层。

`internal/app/cliapp/services/managed` 的后台服务状态文件是 CLI 判断托管 server 启动、停止、重启和异常退出的事实来源。状态刷新、启动失败状态、停止状态和重启状态写入失败必须返回给调用方；旧 `state.json` 删除失败、临时文件替换失败和替换失败后的临时文件清理失败都必须保留错误上下文。当原始操作失败且状态落盘也失败时，使用 `errors.Join` 同时保留原始错误和 `persist managed service state` 错误，避免 CLI 展示过期状态。

`internal/app/cliapp/services/managed` 在 `go run` 场景准备后台托管可执行文件时，会返回 `os.Executable()` 解析失败、临时文件复制失败、复制失败后的 close 错误、旧目标二进制删除失败和失败路径临时文件清理失败。复制失败且 close 也失败、主失败且临时文件清理也失败时使用 `errors.Join` 同时保留两类错误，避免 CLI 把不可靠的后台二进制准备过程误判为可启动。

`internal/app/cliapp/services/managed` 在后台进程启动后会校验 PID 是否仍存活。该校验失败表示运行态事实不可确认，必须写入 failed 状态并返回检查错误；不得把检查错误静默丢弃后误写成“进程已退出”。

`internal/app/cliapp/services/managed` 的 `control.json` 是托管服务停止信号，不再按普通临时文件静默删除。启动新后台 server 前如果无法删除陈旧控制文件，会写入 failed 状态并返回错误，避免新进程误读旧 stop 信号；停止完成后如果控制文件删除失败，也会返回给 CLI 调用方，提示运行态目录需要人工处理。

`internal/app/cliapp/adapters.ProcessRunner` 的后台进程启动、PID 创建时间读取、进程句柄释放、OS 进程查找和 kill 失败必须返回给 `managed.Manager`。启动后如果无法取得可靠 PID 元数据或无法释放进程句柄，adapter 会终止刚启动的子进程并返回原始错误；探测非托管监听进程时，监听 PID 的创建时间、可执行文件和命令行读取失败也必须返回，不得用空元数据继续判断是否为 console server；停止托管或非托管进程时，如果无法确认目标进程已被终止，不得把运行态状态清空为 `stopped`。

托管 server 进程启动控制 watcher 时必须读取当前进程创建时间，用于匹配 CLI 写入的 `control.json` 停止信号。该元数据读取失败会由 `WatchManagedServiceControl` 返回给 server runtime；runtime 会关闭已装配应用资源并写回托管状态，不得降级为只按 PID 匹配控制请求。

`internal/app/cliapp/config.PrintConfigSummary`、`internal/app/cliapp/output.PrintDependencyServiceInfo`、`internal/app/cliapp/output.WriteDBOperationResult`、`internal/app/cliapp/output.PrintServiceState`、`internal/app/cliapp/output.PrintServiceLogs` 和 `run server` 初始化状态输出的 stdout 写入失败必须返回给 CLI handler。它们的输出会被脚本和交互流程用于判断启动配置、依赖服务状态、数据库操作结果、托管服务运行态、日志内容或初始化进度，不属于可静默忽略的提示类输出。

`pkg/cli.PromptUI` 的标准 stdin/stdout 实现必须返回交互输出写入错误。`Select`、`Confirm`、`Input`、`Password` 和 `Info` 的菜单、确认问题、输入提示、密码提示和信息输出都属于 CLI 交互事实；写入失败时不得继续把脚本或人工操作依赖的提示当作已可靠展示。`internal/app/cliapp/handlers` 在 `run` 和 `init` 流程中输出隐私处理完成提示、初始化未完成提示、初始化跳过提示、setup 配置测试摘要、重启提示和字段分组标题时，必须把 `Info` 写入失败返回给 CLI 调用方。

`internal/app/cliapp/config` 的启动前预检修复和隐私配置修复会在配置写入、运行时 env 管理元数据更新或通知驱动切换后输出结果提示。该提示是用户判断本次修复是否已可靠展示的 CLI 事实，`PromptUI.Info` 写入失败必须带上 `write ... notice` 操作上下文返回给 handler，不得静默吞掉后继续返回 `repaired=true`。

`internal/app/cliapp/services/db` 的数据库 DDL 应用和迁移执行会复用真实数据库装配。数据库关闭失败会通过 `closeDatabaseResource` 返回给 CLI 调用方；如果主操作也失败，使用 `errors.Join` 同时保留主错误和关闭错误。迁移成功提示写入 stdout 失败也必须返回，避免脚本调用方误判命令输出已经可靠落盘。

`internal/app/cliapp/handlers.IAMBootstrapHandler` 的 `iam bootstrap-admin` 会复用 `lifecycleapp.Shutdown` 关闭本次 CLI 装配出的存储、执行器、缓存和数据库资源。初始化主流程失败且关闭也失败时，使用 `errors.Join` 同时保留主错误和 `shutdown iam bootstrap runtime` 错误；仅关闭失败时也会返回给 CLI 调用方，避免把资源遗留风险隐藏在日志中。

`pkg/configloader.LoadEnv` 会原样返回 dotenv 文件缺失、读取或解析错误，不再在工具库层吞掉错误。`internal/config.LoadEnv` 只把缺失 `.env` 视为可选跳过；格式错误、权限错误或其他读取错误会返回给 `Manager.Load`、配置诊断或热重载流程，由上层决定失败、保留当前配置或提示修复。

`pkg/configloader.UpdateYAMLScalars` 的配置持久化失败会继续向上返回。目标配置文件写入失败时会尝试恢复旧内容；如果恢复也失败，会用 `errors.Join` 同时保留主写入错误和恢复错误，避免初始化向导或系统配置页面误判文件已安全回滚。配置写入前用于验证内容可落盘的临时文件如果关闭或清理失败，也必须带上下文返回；临时文件残留可能干扰配置目录观测和后续人工排查，不得静默吞掉。

`internal/config.Manager.UpdateWithError` 用于配置更新闭包可能失败的场景。更新闭包返回错误时，manager 必须在验证、持久化和内存替换前返回该错误；初始化中心保存 setup 配置时，`setConfigPath` 的路径映射错误必须通过该入口返回给 Web setup 或 CLI，不得把未写入的配置报告为保存成功。

`internal/app/initapp.runtimeConfigUpdater` 通过 `UpdateWithError` 执行系统配置页面触发的运行时配置更新。单项更新操作如果在配置副本上二次定位失败，必须返回 `ErrInvalidInput` 并保留原始路径上下文；配置管理器不得替换内存配置或持久化错误状态。

`pkg/cache` 的 `hybrid` 模式只在创建实例时允许 Redis 不可用并降级为本地缓存；Redis 创建成功后的运行时错误会从 `Exists`、`MGet`、`IncrBy` 等方法返回给调用方。方法可以同时返回本地已知的部分结果和错误，但不得把远端读取失败伪装成键不存在或零结果。

`pkg/cache` 的 `hybrid` 读穿透和计数同步在 Redis 成功后会回填本地缓存；本地回填失败时，`Get`、`MGet` 和 `IncrBy` 会同时返回 Redis 结果与带 key 上下文的回填错误。调用方可以继续使用已经返回的结果，但不能把本地缓存状态同步失败误认为完全成功。

`pkg/cache.NewRedis` 和 `pkg/cache.redisCache.Reload` 在 Redis client 已创建但 Ping 验证失败时，会继续关闭候选 client；如果关闭也失败，使用 `errors.Join` 同时返回连接验证错误和候选关闭错误。`Reload` 在新连接已经原子替换后，如果旧 Redis client 关闭失败，会返回“reload 已应用但旧连接关闭失败”的错误状态，由应用层按 best-effort 热重载策略记录和告警。

`internal/app/adapters.JSONCacheStore.Incr` 会把计数成功后的 TTL 设置失败继续返回给 IAM service，同时保留计数值。TTL 是调用方显式要求的缓存状态约束，不属于可静默忽略的回填失败。

`internal/transport/http.OperationRecorder` 的操作记录写入是请求完成后的 best-effort 审计动作，不会把已经完成的业务响应改写为失败；但 `RecordOperation` 返回的存储或校验错误会写入 warn 日志，并带上 method、path、status、traceId 和底层错误，避免后台操作审计落库失败无声消失。

`internal/app/reloadapp.Reload` 的运行态热重载仍是 best-effort 流程。关闭旧 cache 或 storage 失败不会回滚已经生效的禁用或替换动作，但会写入 warn 日志，并保留 component action 和底层错误，避免资源释放问题无声残留。

`types/errors` 已删除未使用的具体用户/邮箱错误码，只保留通用参数、业务、认证、授权、资源和系统错误码。模块私有错误通过模块 service 局部错误、handler 映射、`messageKey` 和 `messageArgs` 表达。

`types/result.NewPageResult` 在 `pageSize <= 0` 时不再触发除零 panic，而是保留调用方传入的分页上下文并返回 `totalPages=0`。调用方仍应在 handler/service 做分页参数校验。

`internal/modules/system/service` 的断点上传完成或中止后，单次请求内的临时分片文件和数据库分片记录清理仍不阻断主流程；清理失败不会把已创建资产或已终止会话伪装成失败，但会通过注入的 warn 日志端口记录 `session_id` 和底层错误，便于后续排查与后台补偿清理。

`internal/modules/system/service` 的普通媒体上传和断点上传完成会先写入正式对象，再创建媒体资产元数据。若元数据落库失败，service 会继续向上返回主错误，并尽力删除刚写入的正式对象；删除失败不会掩盖主错误，但会通过 warn 日志记录 `storage_key`、`source` 和底层错误，避免对象存储孤立文件无声残留。

`internal/modules/system/service` 的断点上传分片合并写入失败必须返回 `ErrStorageUnavailable` 并保留分片索引与底层写入错误，不得把合并缓冲区写入失败后的不完整数据继续当作最终媒体资产写入对象存储或数据库。

`internal/modules/system/service` 的单次流量探针旧结果裁剪失败不会影响本次探测结果、目标状态或劫持事件写入，但会通过 warn 日志记录 `target_id` 和底层错误，便于后续排查存储容量或索引问题。

`internal/modules/system/handler` 的流量劫持 SSE 输出会返回 event/data 写入错误。HTTP stream 已开始后不能再改写为统一 JSON 错误，handler 会记录 `system traffic hijack stream write failed` warn 并结束当前 stream，避免继续 flush 已失效连接。

`internal/modules/system/service.RunMaintenanceCleanup` 已提供后台补偿清理用例：它会扫描仍有分片记录的终态或过期上传会话，清理临时分片文件和数据库分片记录，并按流量探针目标补偿裁剪旧结果。该用例返回 `MaintenanceCleanupResult` 和错误；`internal/app/adapters.SystemMaintenanceScheduler` 只负责生命周期调度和日志记录，不吞掉 service 返回的错误。

`internal/modules/iam/service.LoadPolicies` 失败会继续向上返回；角色、成员和初始化权限变更不会把授权引擎刷新失败伪装成成功。`internal/app/adapters.IAMPolicyReloadScheduler` 随应用生命周期按 `auth.casbin_reload_interval_seconds` 后台重试策略重载，失败写入 warn 日志，成功写入 debug 日志，用于补偿提交后授权引擎短暂落后于数据库事实的窗口。

`internal/modules/iam/service.DispatchNotificationOutbox` 已提供通知投递补偿用例：它会扫描到期的 pending outbox，逐条检查邀请、密码重置或邮箱验证资源是否仍处于 pending 且未过期，再调用当前 `Notifier`。单条投递失败会保存尝试次数和下一次重试时间，达到 `auth.notification_retry_max_attempts` 或资源已终态时标记为 failed；调度器 `internal/app/adapters.IAMNotificationOutboxScheduler` 只负责生命周期调度和日志记录，不吞掉 service 返回的错误。

`internal/modules/iam/service.RetryNotificationOutbox` 已提供平台管理员手动补偿用例：它只读取并返回 `NotificationOutboxView` 脱敏视图，不暴露一次性 token 或完整链接；任务重试会写入 `notification.retry` 审计，repository 读取、保存、审计或通知投递失败都会向上返回，由 handler 统一映射为 HTTP 错误。

## 当前已知风险

`iam_notification_outbox` 为了补偿投递会保存明文一次性 token 和完整通知链接；生产数据库访问、备份和导出权限必须按一次性凭据处理。角色和成员权限变更的数据库提交与审计已经共事务，授权引擎 `LoadPolicies` 属于提交后的内存同步，失败会返回给上层，并由 IAM policy reload scheduler 后台重试。IAM 缓存刷新仍按 best-effort 处理；System 维护清理已有后台补偿，清理间隔和批量大小已配置化，仍需要目标环境观测清理耗时和日志噪声。该项已记录在 `docs/backlog/known-gaps.md`。
