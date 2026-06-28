# 社区全栈接入任务树

本文档是本次 `/goal` 的根目录任务树入口，用于记录设计蒸馏、前后端数据接入、社区模块建设、文档与 skill 同步、验证证据和后续推进路径。每次进入新实现阶段前，先更新本任务树中的分析、计划、影响范围和完成标记。

## 当前阶段

- 阶段编号：`P11`
- 阶段主题：社区平台与控制台社区管理设计收敛
- 当前结论：`P1` 已完成社区 setup 边界与真实 API smoke；`P2` 已完成核心页面视觉 QA 与移动端导航避让；`P3` 已完成评论 / 动态本人编辑删除、投稿审核状态流转、审核发布生成社区视频记录和 system media 受控关联；`P4` 已完成少量真实内容视觉节奏与社区前端 Cookie / CSRF 凭证链路；`P5` 已完成后端社区 HTTP 返回面真实数据来源收敛；`P6` 已完成真实 API smoke 的登录注册与账号态页面覆盖；`P7` 已完成分端口直连模式下账号写请求 CORS / CSRF 修复；`P8` 已完成社区注册 / 登录从 IAM 控制台账号体系拆出、独立 `community_accounts` / `community_sessions`、IAM `moderator` / `operator` 角色、后台“社区管理”WebUI 和 Nuxt 首页动态区块移除；`P9` 已将视频分类生产来源收敛到系统字典 `community.video.category`；`P10` 将投稿发布链路改为异步任务：后台只创建 queued 转码任务，社区视频 worker 通过数据库 lease 消费任务，本地模式执行 FFmpeg HLS，云模式通过通用 HMAC webhook dispatch / callback 完成发布；`P11` 补齐投稿 `latestVideoJob` 前台最小摘要、Nuxt 上传页真实状态时间线、后台 `/admin/community` 总览、社区导航上下文兜底、视频任务 `?jobId=` 深链详情和设置页 i18n 漂移收敛。
- 影响范围：`backend/internal/modules/community/**`、`backend/internal/modules/system/**`、`backend/internal/app/initapp/**`、`backend/internal/migrations/**`、`backend/internal/transport/http/**`、`backend/web/app/**`、`frontend/**`、`scripts/check-frontend-community-*.ps1`、`scripts/frontend-community-page-smoke.cjs`、OpenAPI、社区模块文档、前端 README、`TASK_TREE.md` 和前端社区边界检查。

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
        [x] 子叶节点 B3.1.d.3：异步转码任务、HLS 播放源生成、云 webhook 回调和媒体处理状态回写
      [x] 子叶节点 B3.1.d.4：后台投稿审核创建转码任务、视频任务详情可视化和失败重试体验
      [x] 子叶节点 B3.1.d.5：投稿列表装饰 `latestVideoJob` 最小摘要，前台上传页按后端任务状态展示待审核、排队、处理、发布、失败和取消时间线
      [x] 叶节点 B3.1.e：后台社区管理 WebUI 覆盖社区账号、投稿审核和举报处理，页面只消费真实 `/api/v1/community/*` 契约
      [x] 叶节点 B3.1.f：后台 `/admin/community` 社区总览、社区菜单首项、系统菜单缺失兜底和视频任务 `?jobId=` 深链详情收敛
    [ ] 子分支 B3.2：登录态与匿名关系归并
    [ ] 子分支 B3.3：创作者后台、活动运营、批量评论治理和外部通知投递
    [x] 子分支 B3.4：社区账号与 IAM 控制台身份隔离
      [x] 叶节点 B3.4.a：社区注册 / 登录改为 `community_accounts` 与 `community_sessions`，不再创建 IAM 用户、`community-*` 组织、`owner` 角色或 `console_*` 会话
      [x] 叶节点 B3.4.b：历史 `community-*` IAM 账号迁移为社区账号并撤销控制台会话，真正后台管理员、运营和审核员继续保留 IAM 身份
      [x] 叶节点 B3.4.c：新增 IAM `moderator` 与 `operator` 内建角色，并按社区审核 / 运营能力赋予最小权限

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
    [x] 子分支 C2.4：首页移除社区动态区块，动态能力保留在动态页 / 关注流并由页面 smoke 断言 `home pulse=0`
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
    [x] 子分支 C3.6：后端社区 HTTP 返回面真实数据来源收敛
      [x] 叶节点 C3.6.a：`/status` endpoint 清单由真实 route contract 注册结果注入，不在 service 维护静态列表
      [x] 叶节点 C3.6.b：`/home.announcement` 从公告模块已发布数据读取，无公告时返回 `null`
      [x] 叶节点 C3.6.c：视频装饰仅使用持久化分类关联和真实创作者，缺失引用暴露数据一致性错误
      [x] 叶节点 C3.6.d：投稿审核发布生成创作者时不写演示 bio 或默认展示名
    [x] 子分支 C3.7：登录注册与账号态页面 smoke 覆盖
      [x] 叶节点 C3.7.a：真实 API smoke 覆盖社区账号登录、登出、登出后匿名 session 和重新登录 session 恢复
      [x] 叶节点 C3.7.b：真实页面 smoke 覆盖注册、登录会话、错误登录、重新登录和账号态截图
      [x] 叶节点 C3.7.c：真实页面 smoke 覆盖关注 / 取消关注 / 再关注、账号动态、收藏、稍后看、历史、通知已读和双端视觉截图
    [x] 子分支 C3.8：分端口 CORS 与 CSRF 真实联调修复
      [x] 叶节点 C3.8.a：CORS 默认允许头包含平台真实联调必需头，并复用认证模块默认 CSRF header 名称
      [x] 叶节点 C3.8.b：HTTP 装配层按当前 `auth.csrf.header_name` 补齐 CORS allow headers，支持自定义 CSRF header
      [x] 叶节点 C3.8.c：配置示例与本地旧配置补齐 CSRF header，避免分端口直连真实联调时浏览器预检失败
    [x] 子分支 C3.9：系统字典视频分类与 Mock 边界闭环
      [x] 叶节点 C3.9.a：后端 `GET /categories`、视频分类校验、投稿校验和审核发布分类装饰统一读取系统字典 `community.video.category`
      [x] 叶节点 C3.9.b：旧社区迁移不再写入 demo 分类、视频、动态、评论、弹幕、播放源、标签或相关派生记录
      [x] 叶节点 C3.9.c：后台新增“社区分类”入口，复用系统字典 API、字典权限和 `community.video.category` item，不新增平行社区分类存储
      [x] 叶节点 C3.9.d：Nuxt 真实模式不写死 `design` 或 `home` 分类值；“全部”是前端本地虚拟筛选，上传草稿默认分类为空
      [x] 叶节点 C3.9.e：前端社区边界脚本阻止业务代码导入 mock、直接访问 `/api/mock` 或恢复生产分类默认值

[ ] 主干 D：文档、规则与 Skill 同步
  [x] 分支 D1：任务树入口
    [x] 子分支 D1.1：新增根目录 `TASK_TREE.md`
    [x] 子分支 D1.2：写入阶段分析、实施计划、影响范围和 Mark 状态
  [x] 分支 D2：开发文档同步
    [x] 子分支 D2.1：更新 `frontend/README.md` 的 setup、Mock、视觉和验证说明
    [x] 子分支 D2.2：更新 `backend/docs/modules/community.md` 的当前能力和 setup gate
    [x] 子分支 D2.3：同步 API 文档、权限矩阵和 OpenAPI 生成产物
    [x] 子分支 D2.4：同步 `frontend/README.md` 的 API Token、Cookie 会话、CORS credentials 与 CSRF 联调边界
    [x] 子分支 D2.5：同步系统字典视频分类闭环、后台社区分类入口和真实 / mock 模式边界
    [x] 子分支 D2.6：同步异步视频 worker、本地 FFmpeg、云 webhook、后台任务详情和 Nuxt 上传 DTO 边界
    [x] 子分支 D2.7：同步前台 `latestVideoJob` 摘要、后台社区总览、菜单来源和视频任务深链详情说明
  [x] 分支 D3：Skill 同步
    [x] 子分支 D3.1：新增社区全栈协作 skill
    [x] 子分支 D3.2：运行 `scripts/check-agent-skills.ps1`

[x] 主干 E：验证与收敛
  [x] 分支 E1：后端验证
    [x] 子分支 E1.0：`go test ./internal/migrations -count=1 -mod=readonly`
    [x] 子分支 E1.1：`go test ./internal/transport/http -count=1 -mod=readonly`
    [x] 子分支 E1.2：`go test ./internal/modules/community/... -count=1 -mod=readonly`
    [x] 子分支 E1.3：`go run ./cmd/console api openapi --output docs/api/openapi.yaml`
    [x] 子分支 E1.4：`go test ./internal/modules/iam/... -count=1 -mod=readonly`
    [x] 子分支 E1.5：`go test ./... -count=1 -mod=readonly`
    [x] 子分支 E1.6：`powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1`
  [x] 分支 E2：后台 React WebUI 验证
    [x] 子分支 E2.1：`pnpm --dir backend/web/app typecheck`
    [x] 子分支 E2.2：`pnpm --dir backend/web/app lint:i18n`
    [x] 子分支 E2.3：`pnpm --dir backend/web/app test`
    [x] 子分支 E2.4：`pnpm --dir backend/web/app build`
    [x] 子分支 E2.5：`powershell -ExecutionPolicy Bypass -File backend/scripts/visual-qa.ps1 -Grep "admin community routes render backend community management"`
  [x] 分支 E3：Nuxt 前台验证
    [x] 子分支 E3.1：`pnpm --dir frontend typecheck`
    [x] 子分支 E3.2：`pnpm --dir frontend build`
    [x] 子分支 E3.3：`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-boundary.ps1`
    [x] 子分支 E3.4：`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1`
    [x] 子分支 E3.5：`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1`
  [x] 分支 E4：收敛检查
    [x] 子分支 E4.1：`Push-Location backend; powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1; Pop-Location`
    [x] 子分支 E4.2：`Push-Location backend; powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1; Pop-Location`
    [x] 子分支 E4.3：`powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1`
    [x] 子分支 E4.4：`git diff --check`
    [x] 子分支 E4.5：确认未混入本地运行态目录、生成目录、无关用户改动
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

## P5 实施计划

- [x] 分析现状：社区 status service 维护静态 endpoint 列表，handler 在缺失 setup provider 时默认 `completed=true`；首页公告固定为空；视频装饰会按标题猜分类并用 `Unknown` 上传者掩盖缺失创作者；投稿发布会写入演示型创作者简介。
- [x] 影响评估：需要调整 community service、handler、HTTP router、initapp 跨模块注入、模块测试、route 测试和文档；不改变 HTTP path、DTO 字段名、OpenAPI schema、数据库迁移或 Nuxt mock fixture。
- [x] 实施原则：真实 HTTP 返回面只消费 route contract、setup provider、公告模块 service、社区持久化分类关联和真实创作者记录；缺失真实状态或数据引用时暴露错误，不在后端补 Mock fallback。
- [x] 验证收敛：完成后端聚焦测试、后端全量 `go test ./...`、真实社区 API smoke、错误/result 边界检查、前端社区边界检查和 `git diff --check`；`go test ./internal/migrations` 因 SQL 目录无 Go package 无法作为测试入口，已用 setup center 集成测试补证迁移执行链路。

## P9 实施计划

- [x] 分析现状：旧社区迁移仍曾写入 demo 分类 / 视频 / 动态 / 评论等数据，`community_categories` 被当作生产分类来源；Nuxt 上传草稿默认写死 `design`，首页和分类页把 `home` 当作后端分类 slug；前端 `app/mocks` re-export 容易被业务代码误导入。
- [x] 影响评估：需要调整社区迁移、社区 service/repository contract、系统字典 seed、initapp 跨模块注入、后台 React 路由与 i18n、Nuxt 分类状态、mock fixture、真实 API smoke、页面 smoke、边界脚本和文档；不新增平行社区分类存储，也不新增孤立菜单权限。
- [x] 实施原则：系统字典 `community.video.category` 是生产视频分类唯一业务来源；后端真实接口禁止 mock/fixture/static 业务数据；分类缺失时公开分类接口返回空列表，投稿必须显式选择存在分类；前端 mock 只允许 `NUXT_PUBLIC_API_MOCK=true` 时经 API client 进入 `/api/mock`。
- [x] 验证收敛：后端聚焦 / 全量测试、OpenAPI 生成、后台 WebUI i18n/typecheck/test/build、Nuxt typecheck/build、真实 API/page smoke、社区边界检查、agent skill 检查和 `git diff --check` 均已通过。

## P10 实施计划

- [x] 分析现状：`POST /api/v1/community/submissions/:submissionId/transcode` 在 HTTP 请求内同步执行 FFmpeg；云模式只有占位错误；Nuxt 上传结果仍按旧 `sourceName/sourceSize/sourceType/sourceUrl` DTO 映射；后台任务页只展示列表，缺少 worker lease、provider job、HLS 和 renditions 详情。
- [x] 影响评估：需要新增 append-only 任务字段迁移、社区视频任务 claim/process/callback service、repository lease 更新、应用生命周期 worker、通用云 webhook dispatch / callback、route contract、系统配置页字段、后台 WebUI 任务详情、Nuxt 上传 DTO、OpenAPI、文档和 smoke 说明。
- [x] 实施原则：HTTP 创建任务后立即返回 `CommunityVideoJobItem`，异步 worker 统一处理本地 FFmpeg 和云 webhook；云模式只实现通用 HMAC 签名 dispatch / callback，不绑定具体云厂商 SDK；前端不伪造转码结果，只展示后端 submission / job 返回状态。
- [x] 验证收敛：已完成 Go 聚焦 / 全量测试、OpenAPI 生成、后台 WebUI typecheck / i18n / test / build、Nuxt typecheck / build、社区 API/page smoke、后台 WebUI 与前台页面桌面 / 移动端视觉 QA、agent skill 检查、社区边界检查、错误/result 边界检查、plugin-removal 检查和 `git diff --check`；本机 smoke 使用签名 callback 与临时 HLS 文件补足无 FFmpeg/FFprobe 环境下的逻辑闭环。

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

### P5：后端社区真实业务数据来源收敛

- [x] `go test ./internal/modules/community/... -count=1 -mod=readonly` 通过。
- [x] `go test ./internal/modules/announcements/... -count=1 -mod=readonly` 通过。
- [x] `go test ./internal/app/initapp -count=1 -mod=readonly` 通过。
- [x] `go test ./internal/transport/http -count=1 -mod=readonly` 通过。
- [x] `go test ./internal/app -run TestSetupCenterRunEndpointInitializesSystem -count=1 -mod=readonly` 通过，用于补证迁移执行链路；`go test ./internal/migrations -count=1 -mod=readonly` 因该目录只有 SQL、没有 Go package 而不可用。
- [x] `go test ./... -count=1 -mod=readonly` 通过。
- [x] `powershell -ExecutionPolicy Bypass -File backend/scripts/check-error-result-boundaries.ps1` 通过。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-boundary.ps1` 通过。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1` 通过，真实后端 smoke 输出 `home-initial announcement=False`、审核发布生成视频、system media 上传、评论 / 动态编辑删除、账号路径和通知链路均通过。
- [x] `git diff --check` 通过；PowerShell 输出提示 `frontend/README.md` 工作区 CRLF 会在 Git 触碰时按仓库规则转为 LF。

### P6：社区登录注册与全业务多模态 QA 覆盖

- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1` 通过，真实后端 smoke 输出包含 `[account-login] session=...` 与 `[account-logout] loggedOut=True, anonymousSession=True`，并继续覆盖投稿、审核发布、评论 / 动态、关注、历史和通知持久化链路。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1` 通过；桌面输出 `auth account=page_smoke_desktop_...`、`favorite=true`、`watchLater=true`、`notifications cards=4, unreadAfterRead=0`，移动端输出 `auth account=page_smoke_mobile_...`、`collections favorites=1, watchLater=1`、`settings panels=4, endpoints=44`。
- [x] 页面 smoke 截图输出到 `tmp/ai/frontend-community-page-smoke/screenshots`，覆盖 `register`、`login-session`、`login-error`、`login`、`home`、`category`、`search`、`creator`、`creator-account`、`following`、`video`、`history`、`collections`、`notifications`、`upload`、`settings` 的桌面与移动端视图。
- [x] 视觉模型检查 `contact-sheet-desktop.png`、`contact-sheet-mobile.png` 和 `collections-mobile.png`，未发现横向溢出、表单不可见、成功 / 错误提示不可读或关键控件被底部导航遮挡；收藏页补充移动端底部安全间距，并修正 smoke 的底部导航检测候选，避免把页面根容器误判为内容遮挡。
- [x] `pnpm --dir frontend typecheck` 通过。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-boundary.ps1` 通过。
- [x] `node --check scripts/frontend-community-page-smoke.cjs` 通过。
- [x] `git diff --check` 通过；PowerShell 输出提示 `frontend/README.md` 工作区 CRLF 会在 Git 触碰时按仓库规则转为 LF。

### P7：社区账号 CORS / CSRF 真实联调修复

- [x] `go test ./internal/config -count=1 -mod=readonly` 通过，覆盖环境变量覆盖后 CORS 必需请求头补齐。
- [x] `go test ./internal/app/initapp -count=1 -mod=readonly` 通过，覆盖自定义 `auth.csrf.header_name` 也会进入 CORS allow headers。
- [x] `go test ./internal/transport/http -count=1 -mod=readonly` 通过。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1` 通过，账号注册、登录、登出、账号动态、关注、历史和通知真实后端链路继续可用。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-boundary.ps1` 通过。
- [x] 临时真实后端预检验证通过：使用用户报告的同类社区账号写请求 CORS 预检场景，后端返回 `204`，响应包含明确来源、凭证允许标记，并在 `Access-Control-Allow-Headers` 中补齐当前 CSRF header。

### P8：社区账号隔离、控制台社区管理与角色矩阵落地

- [x] 社区注册 / 登录改为独立 `community_accounts` 与 `community_sessions`，响应保持社区前台兼容字段，不再复用 IAM `Signup/Login`。
- [x] 新增迁移 `backend/internal/migrations/20260627000400_create_community_accounts.sql`，创建社区账号 / 会话表，迁移仅属于 `community-*` 组织的历史错误 IAM 社区用户，并撤销其控制台会话和组织成员关系。
- [x] 新增 IAM `moderator` 与 `operator` 内建角色；`moderator` 默认获得投稿审核与举报处理权限，`operator` 默认获得社区账号管理、投稿审核和举报处理权限。
- [x] 后台新增“社区管理”菜单组与 `/admin/community/accounts`、`/admin/community/submissions`、`/admin/community/reports`，统一使用 React API client、query keys、权限态和 i18n。
- [x] Nuxt 首页移除 `CommunityPulse` 动态区，动态能力保留给动态页 / 关注流；页面 smoke 已断言桌面和移动首页 `pulse=0`。
- [x] 后台社区页视觉 QA 已通过：`powershell -ExecutionPolicy Bypass -File backend/scripts/visual-qa.ps1 -Grep "admin community routes render backend community management"` 覆盖 desktop `1440x900` 与 mobile `390x844`。
- [x] 全量后端、后台 WebUI、Nuxt 前台、真实 API smoke、页面 smoke、后端治理脚本、agent skill 检查和 `git diff --check` 均已在本阶段最终收口时通过。

### P9：后端无 Mock 与系统字典视频分类闭环

- [x] 后端分类来源已收敛到系统字典 `community.video.category`；公开分类、视频分类校验、投稿校验、审核发布和视频摘要装饰均不再读取 `community_categories` 生产表或 demo seed。
- [x] 后台新增 `/admin/community/categories` 社区分类入口，复用 system dictionary API、`dictionary:*` 权限和系统字典 item 管理，不新增平行社区分类 API 或孤立权限码。
- [x] Nuxt 真实模式移除 `design` / `home` 运行态分类默认值；上传草稿分类默认为空，“全部”使用本地虚拟筛选值，真实列表查询全部视频时不传 `category`。
- [x] `frontend/app/mocks` 已删除；mock 数据保留在 `frontend/server/api/mock/**` 与 `frontend/shared/mocks/**`，并通过 `scripts/check-frontend-community-boundary.ps1` 阻止业务代码导入 mock、硬编码 `/api/mock` 或恢复生产分类默认值。
- [x] `scripts/check-frontend-community-boundary.ps1` 追加后端生产扫描，覆盖 `backend/internal/modules/community/**`、`backend/internal/app/initapp/**` 和 `backend/internal/migrations/**` 的生产 Go / SQL，阻止恢复 `community_categories`、社区 demo seed、生产分类默认值或 mock / fixture / demo 业务分支。
- [x] `backend/internal/modules/community/service/service_test.go` 的分类 fixture 已改为 `unit-root` / `unit-child` / `unit-leaf` 等中性测试 slug，避免测试数据看起来像生产默认分类。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1` 通过；smoke 先通过系统字典 API 创建 `community.video.category` 测试分类，再用返回 slug 投稿、审核发布和查询视频，输出包含 `[home-initial] categories=1`、`[videos] count=1, category=smoke-video`、`[submissions] status=published`。
- [x] `powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1` 通过；桌面与移动端分类页均显示真实字典分类，输出 `category cards=1, maxCardWidth=260px`，截图输出到 `tmp/ai/frontend-community-page-smoke/screenshots`。
- [x] 后端测试、OpenAPI 生成、后台 WebUI i18n/typecheck/test/build、Nuxt typecheck/build、错误/result 边界检查、社区边界检查、agent skill 检查和 `git diff --check` 均已通过。
- [x] 本轮后端无 Mock 边界补强验证通过：`go test ./internal/modules/community/... -count=1 -mod=readonly`、`go test ./... -count=1 -mod=readonly`、`powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-boundary.ps1` 和 `git diff --check` 均已通过。
