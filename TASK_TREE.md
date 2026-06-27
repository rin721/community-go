# 社区全栈接入任务树

本文档是本次 `/goal` 的根目录任务树入口，用于记录设计蒸馏、前后端数据接入、社区模块建设、文档与 skill 同步、验证证据和后续推进路径。每次进入新实现阶段前，先更新本任务树中的分析、计划、影响范围和完成标记。

## 当前阶段

- 阶段编号：`P4`
- 阶段主题：少量真实内容下的前端视觉节奏与社区前端会话凭证链路收敛
- 当前结论：`P1` 已完成社区 setup 边界与真实 API smoke；`P2` 已完成核心页面视觉 QA 与移动端导航避让；`P3` 已完成 B3.1.a 评论编辑 / 删除、B3.1.b 动态编辑 / 删除、B3.1.c 投稿审核状态流转、B3.1.d.1 审核发布生成社区视频记录、B3.1.d.2 system media / community submission 受控关联和 C3.4/C3.5 真实 API / Mock 边界清理。本轮补充 P4/C1.4：社区前端真实账号接口不配置 API Token，统一使用浏览器 Cookie 会话与 CSRF 双提交凭证链路；API Token 继续只作为后台自动化和机器客户端访问能力。转码、公开播放源治理和后台可视化审核页仍是后续独立叶节点。
- 影响范围：`AGENTS.md`、`frontend/nuxt.config.ts`、`frontend/app/composables/useAoiApi.ts`、`frontend/app/composables/useAoiAuthApi.ts`、`frontend/app/utils/apiCredentials.ts`、`backend/internal/migrations/**`、`backend/internal/modules/community/**`、`backend/internal/transport/http/**`、`backend/docs/api/openapi.yaml`、`scripts/check-frontend-community-api-smoke.ps1`、`backend/docs/**`、`frontend/README.md`、`frontend/app/pages/upload.vue`、`frontend/shared/**`、`frontend/i18n/locales/**`、`.agents/skills/banyao-community-fullstack/SKILL.md`、`TASK_TREE.md`；既有 P3 投稿审核切片还触碰 `backend/internal/modules/iam/service/service.go`、`frontend/app/**`、`frontend/server/api/mock/**` 和 `scripts/frontend-community-page-smoke.cjs`。

## 设计语言蒸馏

参考 `kirakira.moe` 时只吸收设计语言，不做逐像素复刻。已验证的参考事实：

- Desktop 首屏使用 56px 左侧 rail、顶部品牌横幅、横向分类标签、轻公告条和 5 列媒体网格。
- Mobile 首屏使用顶部工具栏、显著品牌字标、2 列视频卡片和底部导航。
- 视觉语言以白底、粉色强调、轻阴影、细边框、稳定 16:9 媒体比例和紧凑元信息为主。
- 情绪表达来自少量星形/斜线几何、短促 hover/focus 状态和轻社区文案；不依赖厚重玻璃拟态、大面积渐变或营销页式 hero。

当前项目前端吸收规则：

- 保留 Aoi 自身的浅色 sakura token、Material Web wrapper、AoiLink/AoiButton/AoiIconButton 和现有视频社区路由。
- 首页、分类、搜索、用户页、播放页优先强化内容可扫描性：稳定媒体比例、短标签、明确状态、低噪声卡片。
- 移动端继续保持顶部工具栏与底部主导航，不让底部导航遮挡列表尾部内容。
- kirakira 的“轻快社区感”只作为节奏和氛围参考，不复制其品牌图形、文案、真实图片或固定结构。

## 任务树

```text
[ ] 主干 A：前端视觉与交互体验融合
  [x] 分支 A1：参考站设计语言分析
    [x] 子分支 A1.1：采集 kirakira.moe desktop 首页结构、色彩、导航、卡片密度
    [x] 子分支 A1.2：采集 kirakira.moe mobile 首页结构、顶部/底部导航、双列卡片节奏
    [x] 子分支 A1.3：提炼可吸收设计原则并排除逐像素复刻
  [ ] 分支 A2：首页与内容流润色
    [x] 子分支 A2.1：首页接入 setup 阻塞态与真实数据错误态
    [ ] 子分支 A2.2：统一首页分类、公告、动态、视频网格的轻边界与移动端间距
      [x] 叶节点 A2.2.a：少量真实视频时 `VideoGrid` 使用稀疏布局，PC 端保持较宽卡片，Mobile 单条视频改为单列展示
    [ ] 子分支 A2.3：补齐空状态、加载状态、错误状态的视觉一致性
  [x] 分支 A3：核心页面响应式 QA
    [x] 子分支 A3.1：桌面 1440x900 截图检查首页、搜索、播放、设置
    [x] 子分支 A3.2：移动 390x844 截图检查首页、播放、用户、上传
    [x] 子分支 A3.3：修正文字溢出、导航遮挡、卡片比例和焦点状态
      [x] 叶节点 A3.3.a：移动底部导航收敛为轻量浮动 dock，并增加页面与焦点目标底部避让
      [x] 叶节点 A3.3.b：继续检查用户页、上传页和设置页的移动端遮挡与长文案折行

[ ] 主干 B：后端社区业务模块与接口契约
  [x] 分支 B1：社区模块基础能力
    [x] 子分支 B1.1：公开读取接口覆盖首页、分类、视频、搜索、创作者、动态
    [x] 子分支 B1.2：互动能力覆盖评论、弹幕、关注、点赞、收藏、稍后看、历史、通知、投稿元数据
    [x] 子分支 B1.3：社区账号响应收敛为普通社区字段，不暴露后台组织/角色/权限
  [x] 分支 B2：初始化状态接入社区公开 API
    [x] 子分支 B2.1：`GET /api/v1/public/community/status` 返回 `setup.required/completed/currentStep`
    [x] 子分支 B2.2：未初始化时内容、账号和账号路径返回 503 result envelope
    [x] 子分支 B2.3：`api.setup.required` locale、OpenAPI 和 HTTP 文档同步
  [ ] 分支 B3：后续业务深化
    [ ] 子分支 B3.1：评论编辑/删除、动态编辑/删除和投稿审核
      [x] 叶节点 B3.1.a：视频评论保存 `client_id` 归属，支持本人编辑 / 删除并同步评论数
      [x] 叶节点 B3.1.b：动态编辑 / 删除契约、页面入口和权限边界
      [x] 叶节点 B3.1.c：投稿审核状态流转、后台处理入口和发布视频 ID 回写
      [ ] 叶节点 B3.1.d：真实媒体上传、转码、视频记录生成和后台可视化审核页
        [x] 子叶节点 B3.1.d.1：审核发布时由投稿元数据与显式 source URL 生成社区视频记录
        [x] 子叶节点 B3.1.d.2：真实媒体上传与 system media / community submission 的受控关联
        [ ] 子叶节点 B3.1.d.3：转码任务、播放源生成和媒体处理状态回写
        [ ] 子叶节点 B3.1.d.4：后台可视化审核页与审核操作体验
    [ ] 子分支 B3.2：登录态与匿名关系归并
    [ ] 子分支 B3.3：创作者后台、举报处理和外部通知投递

[ ] 主干 C：前后端数据接入与 Mock 边界
  [x] 分支 C1：前端真实 API 封装
    [x] 子分支 C1.1：`useAoiApi()` 消费 result envelope 与 setup 错误数据
    [x] 子分支 C1.2：`useAoiAuthApi()` 透传社区账号 setup 错误状态
    [x] 子分支 C1.3：`frontend/shared/types/api.ts` 同步 `CommunitySetupStatus`
    [x] 子分支 C1.4：真实社区账号接口统一使用 Cookie 会话与 CSRF header，不向 Nuxt 前端配置 API Token
  [x] 分支 C2：首页真实数据状态
    [x] 子分支 C2.1：`useHomeFeed()` 暴露 `setupRequired`
    [x] 子分支 C2.2：首页展示初始化引导，避免把未联调状态伪装成真实数据
    [x] 子分支 C2.3：设置高级页展示数据源、接口状态、初始化状态和端点清单
  [x] 分支 C3：Mock 与真实数据验证
    [x] 子分支 C3.1：Nuxt mock `/api/mock/status` 返回 setup 已完成状态
    [x] 子分支 C3.2：真实 API smoke 先完成最小 setup，再验证社区数据
    [x] 子分支 C3.3：页面 smoke 保存桌面与移动端截图并标记真实 API 来源
    [x] 子分支 C3.4：真实 API 注册与真实数据边界
      [x] 叶节点 C3.4.a：真实 API 模式默认通过 `NUXT_BACKEND_ORIGIN` 同源代理访问 `/api/v1/**`，避免社区账号 cookie 请求被浏览器 CORS 凭证规则拦截
      [x] 叶节点 C3.4.b：真实迁移路径追加清理固定 demo ID，保留社区分类 taxonomy，不保留 `Aoi Alpha`、`Layout Notes`、`Color Note` 等演示内容
      [x] 叶节点 C3.4.c：`GET /home` 无真实公告来源时返回 `announcement=null`，Nuxt mock 继续承载演示公告和演示内容
    [x] 子分支 C3.5：后端真实接口去 Mock 化与媒体联调补证
      [x] 叶节点 C3.5.a：根规则明确前端通过 `NUXT_PUBLIC_API_MOCK` / `NUXT_BACKEND_ORIGIN` 切换 Mock 与真实后端模式
      [x] 叶节点 C3.5.b：真实 API smoke 覆盖 system media multipart 上传、投稿审核发布和 `mediaAssetId` 回写
      [x] 叶节点 C3.5.c：确认社区真实接口不新增硬编码演示内容或后端 Mock 分支

[ ] 主干 D：文档、规则与 Skill 同步
  [x] 分支 D1：任务树入口
    [x] 子分支 D1.1：新增根目录 `TASK_TREE.md`
    [x] 子分支 D1.2：写入阶段分析、实施计划、影响范围和 Mark 状态
  [x] 分支 D2：开发文档同步
    [x] 子分支 D2.1：更新 `frontend/README.md` 的 setup、Mock、视觉和验证说明
    [x] 子分支 D2.2：更新 `backend/docs/modules/community.md` 的当前能力和 setup gate
    [x] 子分支 D2.3：同步 API 文档、权限矩阵和 OpenAPI 生成产物
    [x] 子分支 D2.4：同步 `frontend/README.md` 的 API Token、Cookie 会话、CORS credentials 与 CSRF 联调边界
  [x] 分支 D3：Skill 同步
    [x] 子分支 D3.1：新增社区全栈协作 skill
    [x] 子分支 D3.2：运行 `scripts/check-agent-skills.ps1`

[ ] 主干 E：验证与收敛
  [x] 分支 E1：后端验证
    [x] 子分支 E1.1：`go test ./internal/transport/http -count=1 -mod=readonly`
    [x] 子分支 E1.2：`go test ./internal/modules/community/... -count=1 -mod=readonly`
    [x] 子分支 E1.3：`go run ./cmd/console api openapi --output docs/api/openapi.yaml`
  [x] 分支 E2：前端验证
    [x] 子分支 E2.1：`pnpm --dir frontend typecheck`
    [x] 子分支 E2.2：`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-boundary.ps1`
    [x] 子分支 E2.3：`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1`
    [x] 子分支 E2.4：`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1`
    [x] 子分支 E2.5：`pnpm --dir frontend build`
  [x] 分支 E3：收敛检查
    [x] 子分支 E3.1：`powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1`
    [x] 子分支 E3.2：`git diff --check`
    [x] 子分支 E3.3：确认未混入本地运行态目录、生成目录、无关用户改动
```

## 下一阶段进入条件

进入下一阶段前必须满足：

- 本阶段新增或修改的文档、脚本、后端 setup gate 与前端 setup 展示通过聚焦验证。
- `TASK_TREE.md` 更新本阶段实际验证结果，不能把未运行项标为已完成。
- 若继续做可见 UI 润色，先用真实页面截图确定问题，再修改 tokens、Aoi wrapper 或页面结构。
- 若继续做业务能力，先从 `backend/internal/transport/http/contracts.go` 定义契约，再同步前端类型、API client、页面状态和 docs。

## P3 实施计划

- [x] 分析现状：评论创建请求已有 `clientId`，但持久化模型未保存归属，不能安全支持本人编辑 / 删除。
- [x] 影响评估：需要新增 append-only 迁移、社区 DTO、service/repository/handler、route contract、OpenAPI、Nuxt API client、mock API、评论组件、i18n、API smoke 和文档。
- [x] 实施原则：只允许当前匿名或账号 `clientId` 管理自己的新评论；历史种子评论 `client_id` 为空，默认只读；前端只消费 `ownedByCurrentClient`，不通过作者名或本地状态推断权限。
- [x] 验证收敛：完成 Go 测试、OpenAPI 同步、前端 typecheck、社区 API smoke、页面 smoke、agent skill 检查和 `git diff --check`。
- [x] 分析现状：社区动态模型已有 `client_id`，但列表响应未暴露 `ownedByCurrentClient`，也没有本人更新 / 删除契约和关注页操作入口。
- [x] 影响评估：需要新增动态 DTO、service/repository/handler、route contract、OpenAPI、Nuxt API client、mock API、`CommunityPulse` 编辑 UI、关注页状态、三语 i18n、API smoke、页面 smoke 和文档 / skill 同步。
- [x] 实施原则：动态只允许当前匿名或账号 `clientId` 管理本人内容；本切片只编辑动态正文，不变更关联视频；历史种子动态 `client_id` 为空，默认只读；前端只消费 `ownedByCurrentClient`。
- [x] 验证收敛：完成 Go 测试、OpenAPI 同步、前端 typecheck、真实 API smoke、真实页面 smoke、社区边界检查、错误/result 边界检查、agent skill 检查和 `git diff --check`。
- [x] 分析现状：投稿表只保存 `pending_review` 元数据，前端上传页也只展示待审核状态；社区模块没有从投稿直接创建视频的 repository 端口。
- [x] 影响评估：需要新增 append-only 迁移、审核状态 DTO、主系统权限路由、IAM 内置权限、OpenAPI、Nuxt 共享类型、上传页状态展示、mock 状态 helper、API smoke 和文档 / skill 同步。
- [x] 实施原则：审核入口使用 `GET /api/v1/community/submissions` 与 `PATCH /api/v1/community/submissions/:submissionId/review`，受 `community_submission:review` 权限保护；`published` 可以回写既有公开视频 ID，也可以在显式提供 `sourceUrl` 与 `durationSeconds` 时生成社区视频记录；不在本切片创建媒体文件或转码结果。
- [x] 验证收敛：完成 Go 测试、OpenAPI 同步、前端 typecheck、真实 API smoke、页面 smoke、社区边界检查、错误/result 边界检查、agent skill 检查和 `git diff --check`。
- [x] 分析现状：system media 已提供主系统权限保护的 multipart 上传、URL 导入、分片上传和下载能力；社区投稿审核发布已能用显式 `sourceUrl` 生成视频，但投稿记录没有保存受控媒体资产引用，真实联调也未证明文件字节先进入 system media。
- [x] 影响评估：需要新增 append-only 迁移、社区最小媒体资产投影、repository/service DTO、OpenAPI、Nuxt 共享类型、上传页回执展示、真实 API smoke 的 multipart 上传补证、文档、根规则和 skill 同步。
- [x] 实施原则：匿名或账号投稿创建不允许直接声明任意 `mediaAssetId`；媒体资产关联只在主系统审核发布接口中发生，并继续受 `community_submission:review` 与 system media 上传权限保护。社区模块只读取 `system_media_assets` 最小投影，不复制 system media 上传逻辑；`sourceUrl` 保留为过渡路径。
- [x] 验证收敛：完成 Go 测试、OpenAPI 同步、前端 typecheck、真实 API smoke、真实页面 smoke、社区边界检查、错误/result 边界检查、agent skill 检查和 `git diff --check`。

## P4 实施计划

- [x] 分析现状：真实页面 smoke 通过真实 API 播种 1 条视频后，首页、搜索结果和创作者最新投稿仍沿用多列 `auto-fill` 网格，PC 端卡片约 224px 且右侧出现大面积空白；自动生成创作者 handle 在窄身份列中会折成多行。
- [x] 影响评估：需要调整共享 `AoiContentGrid` 的可选网格模式、`VideoGrid` 的少量内容布局、视频网格 token、创作者页 handle 展示，以及前端 README / fullstack skill / 任务树记录；不改变 API、DTO、Mock 数据和业务状态。
- [x] 实施原则：默认网格继续保持既有 `auto-fill` 行为，只有视频列表在 1-2 条真实数据时启用 `auto-fit` 与受控最大卡片宽度；移动端单条视频使用单列，避免右侧空洞；超长 handle 视觉上省略但保留 `title` 可查看完整值。
- [x] 验证收敛：完成 `pnpm --dir frontend typecheck`、真实页面 smoke、截图复核、社区边界检查、agent skill 检查和 `git diff --check`。
- [x] 分析现状：`useAoiAuthApi()` 已用 `credentials: "include"` 登录 / 注册，但 `useAoiApi()` 访问 `/api/v1/public/community/account/*` 时未携带浏览器会话 Cookie，也未为账号写请求注入 CSRF header，导致真实登录后的账号路径容易被误判为缺少凭证。
- [x] 影响评估：只需收敛 Nuxt runtime config、前端 API composable、轻量 CSRF helper、前端 README 和任务树；不修改后端 API Token、route contract、OpenAPI、数据库或权限模型。
- [x] 实施原则：Nuxt 社区前端不配置 API Token；API Token 继续作为后台自动化 / 机器客户端凭证。浏览器真实模式使用 Cookie 会话，写请求按后端默认 `console_csrf` / `X-CSRF-Token` 做双提交 CSRF。
- [x] 验证收敛：完成 `pnpm --dir frontend typecheck`、社区边界检查、真实 API smoke、真实页面 smoke、`pnpm --dir frontend build` 和 `git diff --check`。

## 阶段验证记录

### P2：真实页面视觉 QA 与移动端导航避让

- [x] `scripts/frontend-community-page-smoke.cjs` 在启动 Nuxt 前完成临时后端首次初始化，并设置隔离 dev server 所需的 `NUXT_IGNORE_LOCK=1`。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1` 通过，真实 API 截图输出到 `tmp/ai/frontend-community-page-smoke/screenshots`。
- [x] 桌面截图已覆盖 `home`、`category`、`search`、`video`、`creator`、`upload`、`settings` 的 `1440x900`。
- [x] 移动截图已覆盖 `home`、`category`、`search`、`video`、`creator`、`upload`、`settings` 的 `390x844` 真实视口。
- [x] 移动端底部主导航从全宽固定栏调整为轻量浮动 dock，并通过 `scroll-padding` / `scroll-margin` 为表单、链接、按钮和内容区保留底部避让。
- [x] 页面 smoke 新增横向溢出、失败态、移动端底部 dock 可达性检查，并在 `settings` 高级页前显式切换到 `all` 设置深度。
- [x] `frontend/app/stores/auth-session.ts` 对并发 `refreshSession()` 做 in-flight 去重，避免多 store 同时探测匿名会话时触发临时后端限流。
- [x] `frontend/app/components/UploadDropZone.vue` 允许超长文件名按 `overflow-wrap:anywhere` 换行，移动端截图已覆盖长文件名状态。

### P3：本人评论与动态编辑 / 删除真实联调

- [x] `backend/internal/migrations/20260626001100_add_community_video_comment_client_id.sql` 新增视频评论 `client_id` 归属列和索引；历史空 `client_id` 评论保持只读。
- [x] `backend/internal/transport/http/contracts.go` 新增公共与账号范围的 `PATCH/DELETE /videos/:idOrSlug/comments/:commentId` 契约，并重新生成 `backend/docs/api/openapi.yaml`。
- [x] `frontend/app/pages/video/[id].vue`、`CommentThread`、`CommentItem` 接入 `ownedByCurrentClient`，只为当前匿名或账号评论展示编辑 / 删除操作。
- [x] Nuxt mock API、共享 DTO、三语 i18n、后端模块文档、前端 README 和社区 fullstack skill 已同步评论归属规则。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1` 通过，真实后端验证评论创建、本人查询标记、更新和删除。
- [x] `backend/internal/transport/http/contracts.go` 新增公共与账号范围的 `PATCH/DELETE /dynamics/:dynamicId` 契约，并重新生成 `backend/docs/api/openapi.yaml`。
- [x] `frontend/app/components/CommunityPulse.vue` 和 `frontend/app/pages/feed/following.vue` 接入 `ownedByCurrentClient`，只为当前匿名或账号动态展示编辑 / 删除操作。
- [x] Nuxt mock API、共享 DTO、三语 i18n、后端模块文档、前端 README 和社区 fullstack skill 已同步动态归属规则。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1` 通过，真实后端验证评论与动态的创建、本人查询标记、更新和删除；输出包含 `[dynamics] updated=Updated smoke dynamic, deleted=True` 与 `[account-dynamics] updated=Updated account smoke dynamic, deleted=True`。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1` 通过，端点清单为 44，桌面与移动截图新增覆盖 `following` 页面和本人动态操作入口，截图输出到 `tmp/ai/frontend-community-page-smoke/screenshots`。
- [x] `backend/internal/migrations/20260627000100_add_community_submission_review_state.sql` 为投稿元数据补充审核备注、审核人、审核时间、发布视频 ID 和发布时间。
- [x] `backend/internal/transport/http/contracts.go` 新增 `GET /api/v1/community/submissions` 与 `PATCH /api/v1/community/submissions/:submissionId/review`，权限为 `community_submission:review`，并重新生成 `backend/docs/api/openapi.yaml`。
- [x] `frontend/app/pages/upload.vue` 和 `frontend/shared/types/api.ts` 展示 / 接收 `approved`、`rejected`、`published`、审核意见、审核时间和发布视频 ID。
- [x] `backend/internal/modules/community/service` 与 repository 支持审核发布时根据投稿元数据、显式 `sourceUrl` 和 `durationSeconds` 写入 `community_videos`、默认播放源、分类关联、标签和自动生成创作者资料；绑定既有视频 ID 的路径继续保留。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1` 已通过，验证投稿创建、审核队列、审核通过、审核发布生成社区视频记录，并通过视频详情接口读回新记录；本轮输出包含 `[submissions] status=published, video=video-2070784069112696832`。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1` 通过，上传页桌面 / 移动截图无明显布局破坏，截图输出到 `tmp/ai/frontend-community-page-smoke/screenshots`。
- [x] `backend/internal/migrations/20260627000300_add_community_submission_media_asset.sql` 为投稿审核发布补充受控 `media_asset_id`，普通投稿创建仍只保存文件元数据。
- [x] `scripts/check-frontend-community-api-smoke.ps1` 通过 system media multipart 上传创建媒体资产，再用 `mediaAssetId` 审核发布投稿；输出包含 `[media-upload] asset=2070794123463364608, source=upload` 与 `[submissions] status=published, video=video-2070794123161374720, mediaAsset=2070794123463364608`。
- [x] `scripts/frontend-community-page-smoke.cjs` 在启动 Nuxt 前通过真实 API 创建投稿、审核发布、评论和动态，并用返回的 `videoSlug` / `creatorHandle` 验证首页、搜索、播放页和创作者页；桌面输出 `home videos=1, dynamics=1`，移动输出 `home videos=1, dynamics=2`。

### P4：少量真实内容下的视频网格与身份栏视觉节奏

- [x] `frontend/app/components/aoi/AoiContentGrid.vue` 新增 `mode="fit"` 可选模式，默认仍为 `fill`，避免影响分类、设置和普通内容网格。
- [x] `frontend/app/components/home/VideoGrid.vue` 在 1-2 条视频时启用稀疏布局，PC 端卡片最大宽度由 `--aoi-video-grid-sparse-card-width` 控制；移动端单条视频使用单列。
- [x] `frontend/app/pages/u/[handle].vue` 的长 `@handle` 改为单行省略并保留 `title`，避免自动生成 handle 在桌面身份栏中折成多行。
- [x] `pnpm --dir frontend typecheck` 通过。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1` 通过；真实 API 播种 1 条视频后，桌面首页 / 搜索 / 创作者页截图中视频卡片宽度提升到稀疏布局，移动端继续通过 `390x844` 验证。

### P4：社区前端会话凭证链路

- [x] `frontend/nuxt.config.ts` 暴露 `csrfCookieName=console_csrf` 与 `csrfHeaderName=X-CSRF-Token` 默认值，并允许通过 `NUXT_PUBLIC_AUTH_CSRF_COOKIE_NAME` / `NUXT_PUBLIC_AUTH_CSRF_HEADER_NAME` 覆盖。
- [x] `frontend/app/utils/apiCredentials.ts` 只在客户端读取 CSRF cookie，并只为 `POST` / `PATCH` / `DELETE` 生成 CSRF header；SSR 或缺少 cookie 时不注入空 header。
- [x] `frontend/app/composables/useAoiApi.ts` 和 `frontend/app/composables/useAoiAuthApi.ts` 在真实请求中保持 `credentials: "include"`，账号写请求可随 Cookie 会话携带 CSRF header。
- [x] `frontend/README.md` 明确 API Token 是后台机器访问凭证，不是 Nuxt 社区登录凭证；真实浏览器模式依赖 Cookie、CORS `allow_credentials=true`、一致 host 和 CSRF cookie/header。
- [x] `pnpm --dir frontend typecheck`、`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-boundary.ps1`、`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1`、`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1`、`pnpm --dir frontend build` 和 `git diff --check` 均已通过。
