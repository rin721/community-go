# 090 任务与证据

## 研究与计划

- [x] R090-001 审计当前 Shell、页面截图、共享组件、Token、查询状态和响应式；证据：`research/R090-001-current-webui-system-audit/`。
- [x] R090-002 研究用户参考图与 TailAdmin 官方布局、Dashboard、列表和表单；证据：`research/R090-002-tailadmin-layout-study/`。
- [x] R090-003 盘点当前 WebUI registry 与模块 API 操作并分级后端缺口；证据：`research/R090-003-backend-capability-gap/`。
- [x] R090-004 复核 HeroUI v2/v3 混用、候选路径与可访问边界；证据：`research/R090-004-frontend-foundation-reassessment/`。
- [x] PLAN-090-001 完成客户需求、详细设计、页面蓝图、后端演进与验证方案；证据：`requirements/`、`design/`。
- [x] CONFIRM-090-001 用户在本计划报告之后明确确认 090 当前方案；前置：全部研究和计划已完成；完成证据：用户消息“确认 090 计划”，本目录 README 状态已更新。

## 实施基线

- [x] BASELINE-090-001 记录确认时 revision 与 Git 状态，定向检查 087 对 AppShell/Workspace 的漂移；前置：CONFIRM-090-001；完成证据：确认基线为 `47d2d9a`，087 已提交；复核 AppShell、WorkspaceRegistry、Mock 路由与现有几何 E2E，未发现 087 相关漂移。
- [x] BASELINE-090-002 确认导航文档写入点不覆盖用户未提交改动；前置：BASELINE-090-001；完成证据：`docs/changes/README.md` 保留用户已有修改，090 未覆盖该文件；`admin-design-baseline.md` 与 `temp-new-changes.md` 的用户删除保持不变。

## 前端基础

- [x] FE-090-001 移除 HeroUI v2 Theme/Toast，完成 HeroUI v3 单轨依赖、Provider 和 Toast 迁移；前置：BASELINE-090-001；完成证据：`webui/package.json`、`pnpm-lock.yaml`、`tailwind.config.js` 已移除 v2 包和 theme plugin；ToastProvider/toast 使用 v3 API；`pnpm typecheck`、`pnpm build`、`pnpm test` 通过，旧包零引用搜索通过。
- [x] FE-090-002 重组 Design Token 并建立硬编码/过期 Token 门禁；前置：FE-090-001；完成证据：`webui/src/styles.css`、`scripts/style-rules.mjs`、`pnpm test:layout` 与亮暗/密度视觉 E2E。
- [x] FE-090-003 拆分巨型 UI 实现为 primitives、feedback、data、forms；前置：FE-090-001；完成证据：`webui/src/ui/{layout,patterns,feedback,forms,data}.tsx`、`layout-pattern.test.tsx`、全量 Vitest 通过，旧移动实现无残留引用。
- [x] FE-090-004 实现统一图标、文本和可访问名称策略，移除 emoji 与散落 fallback 文案；前置：FE-090-003；完成证据：Lucide 图标替换、宿主 i18n 兜底键、`pnpm lint:i18n` 与源码 emoji 搜索。

## Shell 与模式组件

- [x] SHELL-090-001 实现新 Sidebar、Header、ContentViewport 和条件 WorkspaceRail；前置：FE-090-002；完成证据：`AppHeader`、`SidebarMenu`、`WorkspaceTabs`、`styles.css` 的壳层 Token，导航父路由展开单测与 390px/桌面视觉 E2E；低频全屏入口下沉到账号菜单，顶部保留搜索、语言与快速主题切换，降低工具区拥挤。
- [x] SHELL-090-002 实现六种 PageFrame 与统一滚动/宽度/错误边界；前置：SHELL-090-001；完成证据：`PageFrameVariant` 六种场景、`layout-pattern.test.tsx`、4 项视觉/几何 E2E；设置组与子页面沿用已验证的双层宽度基线。
- [x] PATTERN-090-001 实现 ResourceIndex、QueryToolbar、ActiveFilters、DataGrid/RecordList、SelectionBar；前置：FE-090-003、SHELL-090-002；完成证据：`ResourceIndex` 已在账户、角色、权限、会话、API Token、审计和岗位列表统一复用，`FilterBar`、`ActiveFilters`、`DataTable`、`BulkActionBar` 组成 toolbar/content/footer 顺序，筛选 URL 状态、逐项清除、浏览器前进/后退同步、权限目录的加载/失败/空结果反馈和数据表增强测试通过。
- [ ] PATTERN-090-002 实现 EntityDetail、FormPage、SettingsForm 与 StickyActionBar；前置：FE-090-003、SHELL-090-002；当前证据：账户/角色管理区已使用 `EntityDetail` 的身份/状态头部，IAM/Settings Security、Profile、账号角色分配、角色权限分配、组织部门编辑和任职编辑表单已接入 `PageFrame`/`StickyActionBar`，列表分页已统一复用 `Pagination`；`StickyActionBar` 现支持 clean/dirty/pending/conflict 状态、状态播报与窄屏固定，Profile、Security、账号角色分配与角色权限分配已接入 dirty/pending，Profile、账号角色分配与角色权限分配已接入 conflict；完整详情页冲突/关系状态流程仍由后续页面任务补齐，结构单测通过。
- [ ] PATTERN-090-003 实现 BatchOperation 与统一 Feedback matrix；前置：PATTERN-090-001；当前增量：账户批量操作已复用 `BatchResultSummary`，服务端同步结果现包含请求/处理/成功/失败集合、稳定错误码、retryable 和 correlation ID，`Idempotency-Key` 可安全重放；运维诊断失败已复用 `ErrorState` 并投影 request id；完整 preview/running/partial 状态机及 P1/P2 异步 Job 适配仍待补齐。
- [x] PATTERN-090-004 实现 Global Search、Command registry、Action 层级和权限/availability 投影；前置：FE-090-003、SHELL-090-001；完成证据：`webui/src/commands/registry.ts` 统一投影可访问/可加载路由与宿主动作，`AppShell` 注册主题/模式/退出命令，`RouteSearch` 统一键盘选择、动作元数据和危险动作确认入口；`registry.test.ts`、`route-search.test.ts` 覆盖权限过滤、可用性过滤、关键词检索和 ARIA 语义。
- [ ] PATTERN-090-005 以真实指标完成 Statistic/Chart spike 并实现可解释可视化契约；前置：BE-090-001；当前证据：Dashboard 运维卡片已将标量响应投影为结构化事实列表，避免主界面直接倾倒原始 JSON；Monitoring 只展示已有进程指标，未接入的宿主磁盘/网络遥测改为说明文本，不再伪装为同等重要数据卡片；真实历史指标、数据口径、可访问数据表与 bundle 测量仍待补齐。

## 后端 P0

- [ ] BE-090-001 逐资源统一查询、排序、分页/游标和错误语义；前置：R090-003、CONFIRM-090-001；当前证据：IAM 全部列表资源（账户/角色/会话/API Token）排序经服务层白名单校验，非法排序列/方向返回稳定 `ErrInvalidQuery` → HTTP `400 invalid_request`，不再静默忽略（此前账户列表非法排序静默回退默认、角色/会话/Token 非法排序落 500）；过大分页（limit>100）在 HTTP 边界由 schema `maximum` 稳定拒绝，service 层 `normalizePage` 同样返回 `ErrInvalidQuery`（非 HTTP 调用方同样受保护）；审计游标分页已落地（见 BE-090-003）；service 与 HTTP 集成测试覆盖非法排序列/方向/畸形排序/过大分页/合法排序不回归。
- [x] BE-090-002 实现账户/角色核心详情与影响摘要；前置：BE-090-001；完成证据：`iam.accounts.read` 在一次存储访问中返回账户生命周期、角色快照、授权 revision、活跃/全部会话与有效 API Token 计数；`iam.roles.read` 返回角色生命周期、权限定义、受影响账户、跨模块范围及关键/敏感权限计数。权限风险已成为各 owner 模块显式声明且 Catalog 强校验的 `standard/elevated/critical` 元数据，前端不再按字符串推断；两类详情分别复用 `iam:account:read` / `iam:role:read`，not-found 保持稳定 Problem 语义，service、HTTP 集成测试、OpenAPI 和 WebUI E2E 已覆盖。
- [ ] BE-090-003 实现审计 event/correlation/time range/detail 投影；前置：BE-090-001；当前增量：已有自增键已投影为只读 `eventId`，HTTP request-id 已贯通低敏持久化 `correlationId`，服务端按关联请求筛选，WebUI 列表/详情可查看并复制 correlation ID；actor/subject digest 与时间范围筛选及 OpenAPI/WebUI 已同步。新增 `auth.audit.read` 独立详情投影，保留窗口外 ID 返回稳定 `not_found`，前端详情不再依赖列表行快照并具备 loading/Problem/retry；客户端错误继续投影 requestId。稳定游标已落地：服务端按 `(occurredAt,eventId)` 倒序 keyset 翻页（repo `ListAuditEventsAfter`，limit+1 探测 `hasMore`），游标为低敏不透明字符串（JSON+base64url，无对象内容），非法/过期游标返回稳定 `invalid_cursor` 400；HTTP 契约用 `cursor` 查询参数替换 `offset`，响应返回 `nextCursor`/`hasMore`，OpenAPI、operation inventory 与 WebUI 快照已重新生成；WebUI 审计页改用会话内游标栈的上一页/下一页导航，筛选与每页条数变化回到第一页；sink 集成测试覆盖 7 条同刻事件游标翻页不重不漏与无效游标 fail closed。
- [x] BE-090-004 标准化批量结果、幂等和部分失败；前置：BE-090-001；完成证据：IAM 批量启停/归档要求 `Idempotency-Key`，三驱动 migration 持久化请求摘要与完整结果；响应包含 requested/processed/succeeded/failed/correlation，逐项失败使用稳定 code、受控 message 与 retryable；相同 key+请求重放原结果且不重复递增资源版本，不同请求复用 key 返回 `idempotency_conflict`，并发未完成返回 `idempotency_in_progress`；service、HTTP 集成、migration、OpenAPI 与 WebUI typecheck 已覆盖。
- [ ] BE-090-005 实现需要跨设备保持的用户偏好契约；前置：BE-090-001；当前证据：新增 `iam_user_preferences` 表（三驱动 migration 000010，账号一行 JSON 覆盖）与 `iam:account:self:preferences:read/write` 权限键（Risk standard，owner 经 `ReconcileOwnerCatalog` 自动获得）；`GET/PATCH /api/v1/iam/self/preferences` 自服务契约——读取返回系统默认合并用户覆盖的有效值（语言/时区/主题模式/主题色/密度/减少动效/通知四布尔），PATCH 部分字段合并（省略保持现值，通知以显式指针区分「未提交」与「显式关闭」），非法枚举/时区返回稳定 `invalid_request`；WebUI 设置中心 Appearance/Language 页改为服务端持久化（本地 localStorage 投影保持同步，后端不可用时明确降级提示）；service、HTTP 集成、migration、OpenAPI、WebUI typecheck 与 mock E2E 已覆盖。

## 页面迁移

- [ ] PAGE-090-001 迁移账户列表与详情作为标杆切片，删除旧布局与状态实现；前置：PATTERN-090-001、PATTERN-090-002、BE-090-002；当前证据：账户列表/管理区已使用 `ResourceIndex`、`EntityDetail`、统一 `Pagination` 和 URL 分页状态，筛选/排序会回到第一页，批量结果反馈已覆盖，角色分配已接入 clean/dirty/pending/conflict 保存条并由 dev E2E 覆盖；详情抽屉已删除“列表行快照 + 角色请求”拼接，改由 `iam.accounts.read` 原子聚合投影驱动，并按账户概览、安全影响摘要、访问关系分段展示，含 loading/Problem 重试态和 E2E 视觉证据。组织关系、受控活动投影、完整视觉矩阵与零旧引用仍待补齐。
- [ ] PAGE-090-002 迁移角色、权限、会话和 API Token；前置：PAGE-090-001；当前证据：角色管理区已使用 `EntityDetail`、统一 `Pagination` 与 URL 分页状态，现由 `iam.roles.read` 聚合详情展示受影响账户、权限/模块范围和关键/敏感风险计数，权限矩阵逐项显示 Catalog 风险元数据并具备加载/Problem 重试态；权限目录具备统一查询反馈，会话与 API Token 列表已接入服务端 `offset/limit/total` 分页及页码/筛选 URL 状态。角色影响摘要已有 E2E 视觉证据；会话/Token 批处理、一次性 secret 完整流程与响应式视觉矩阵仍待补齐。
- [ ] PAGE-090-003 迁移审计；前置：PATTERN-090-001、BE-090-003；当前证据：筛选器已覆盖 operation/action/outcome/actor/subject/resource/correlation/time range，事件列表与详情均展示可复制的低敏 correlation ID；详情抽屉由独立服务端投影驱动，保留低敏字段与 JSON 视图，并覆盖 loading/Problem/retry；分页已从 offset 迁移到服务端游标（`cursor`/`nextCursor`/`hasMore`），页面提供会话内上一页/下一页导航与每页条数切换，筛选变化回到第一页；视觉矩阵与完整查询测试仍待补齐。
- [ ] PAGE-090-004 迁移组织 Tree、岗位和任职；前置：PATTERN-090-002；当前证据：部门 Tree、岗位目录和账号任职页均使用统一 PageFrame/分栏骨架，任职保存条已呈现 clean/dirty/pending/conflict 状态，组织管理 E2E 覆盖树、岗位与任职编辑；移动预检、成员视图、键盘与响应式矩阵仍待补齐。
- [ ] PAGE-090-005 迁移设置；前置：PATTERN-090-002、BE-090-005；当前证据：Profile/Security/Account 子页面统一使用 `PageFrame`，Profile/Security 保存操作使用 `StickyActionBar`，Profile/Security 已呈现 dirty/pending 状态，设置组导航与内容宽度 E2E 已通过；Appearance/Language 已接入服务端跨设备偏好（默认合并覆盖、PATCH 部分更新、本地投影同步与离线降级提示）；作用域、完整保存冲突和窄屏矩阵仍待补齐。
- [ ] PAGE-090-006 重构 Dashboard 与系统状态；前置：SHELL-090-002；当前证据：运维能力卡片已从原始 JSON 改为有限标量事实摘要，并保留加载/失败/重试状态；监控区不再将未接入的宿主磁盘/网络指标伪装成同等重要卡片，而是明确保留接入说明；真实数据来源、口径、行动路径和视觉矩阵仍待补齐。
- [ ] PAGE-090-007 重构 OpenAPI workbench；前置：SHELL-090-001、PATTERN-090-003；当前证据：三类断点（wide 可调资源栏 + 编辑/响应分栏、compact <768px 切换为「资源/请求/响应」三段式导航、每次单面板，树叶子选择后自动切请求段）、长内容（长 revision/path/JSON 进入 `overflow-wrap:anywhere`/面板自身滚动，绝不扩大页面布局宽度）、发送/响应（dev E2E 覆盖 Send/response、mock 禁执行提示）与无横向页面溢出（390px 单面板切换 E2E 断言 scrollWidth≤viewport）。新增 `useCompactWorkspace` 容器级断点 hook 与紧凑段选择器，单元测试覆盖三段式切换、mock E2E 覆盖 390px 单面板切换与溢出断言。

## 验证与收尾

- [ ] VERIFY-090-001 执行单元、组件、集成、E2E、类型、lint、构建和 Go 侧适用验证；前置：全部 P0 实施任务；完成证据：实际命令与结果。
- [ ] VERIFY-090-002 完成 1440/1280/1024/768/390、亮暗、normal/compact 和完整状态的多模态视觉复核；前置：全部页面迁移；当前证据：`webui/e2e/webui-mock.spec.ts` 的 090 矩阵测试已覆盖 7 个代表页面族、5 档视口、横向溢出断言，并保存 Dashboard 亮色与暗色/compact 截图；完整状态、全部页面族和人工审阅记录仍待补齐。
- [ ] VERIFY-090-003 完成键盘、焦点、读屏语义、对比度、长文本和高密度数据验证；前置：全部页面迁移；完成证据：自动化与人工记录。
- [ ] CLEANUP-090-001 搜索并删除旧 UI、旧 Token、HeroUI v2、旧 CSS、旧工作区表现和失效文档；前置：VERIFY-090-001；完成证据：零引用搜索与完整 diff。
- [ ] DOC-090-001 同步 WebUI 权威文档、OpenAPI、变更导航和视觉基线；前置：CLEANUP-090-001；完成证据：文档链接与实现一致性复核。
- [ ] GIT-090-001 按仓库规则审阅、精确暂存并提交本任务；前置：全部验证通过；完成证据：Conventional Commit 哈希。
