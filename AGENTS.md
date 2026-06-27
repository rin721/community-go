# Agent Rules：聚合项目级规则

本文件是当前 `banyao-web` 聚合仓库的项目级长期规则。仓库包含 `backend/` 后台管理 / 控制台平台代码和 `frontend/` Nuxt 视频社区前端代码；所有开发、重构、修复、初始化、配置、WebUI、runtime、文档、测试、技能和工程治理任务都必须先遵守本文件。

## 适用范围

- 本规则适用于根目录、`backend/`、`frontend/`、`.agents/skills`、脚本、文档、示例、测试、构建、部署和运行态资料。
- 根目录 `AGENTS.md` 是本聚合仓库唯一项目级 Agent Rules 入口；子目录中的补充说明、工具提示或上游源码自带文件只能作为来源材料，不得覆盖、削弱或绕开本文件。
- 后端规则由本文件的后端章节和根目录 `.agents/skills` 共同约束；路径、命令和验证必须按当前聚合目录定位到 `backend/...`。
- 前端专项规则只在任务触碰 `frontend/**`、`backend/web/app/**`、前端构建/视觉/i18n/API client/组件体系，或用户明确要求开发前端时生效。
- 若任务要求与本规则冲突，必须先指出冲突并确认处理方式。

## 仓库定位

- `backend/` 是可运行、可扩展、可二次开发的开源后台管理 / 控制台平台底座。
- `backend/` 主平台统一承载账号、权限、组织租户、配置、审计日志、API catalog、媒体、版本、系统管理、初始化和基础运营能力。
- `frontend/` 是 Nuxt 4 前端优先的视频社区应用，覆盖首页发现、分类浏览、搜索、关注动态、视频播放、用户页、观看记录/收藏、上传草稿和设置中心。
- 未来业务扩展优先通过 `backend/internal/modules` 新增模块，并通过后端 contract、前端 API client、页面、i18n、测试和文档同步落地。
- 不得在任一前端凭空实现后端尚未暴露的生产能力；mock、fixture 和本地状态必须清楚标记为前端体验或开发辅助。

## 强制规则

- 交付面只保留当前架构需要的产物、入口、字段、示例、文档、逻辑和运行路径。
- 发现与当前设计不一致的实现后，必须收敛到当前设计，并让交付面保持单一运行路径。
- CLI、WebUI、runtime、配置加载和初始化流程不得各自维护重复逻辑；共享行为必须收敛到统一实现。
- 修改代码前必须分析现状、调用链、依赖关系和影响边界；不得基于猜测修改代码。
- 新增或改造能力前，必须先调研并优先复用 GitHub、npm registry、Go modules、Nuxt/Vue/React 生态和项目既有依赖中的成熟开源方案；只有在现有方案不满足架构边界、许可、安全、维护性、体积、性能或本仓库统一入口要求时，才可自研，并在实现或说明中写明取舍。
- 复用第三方开源方案时，必须通过本仓库既有封装、配置、API client、route contract、i18n、错误/result、依赖锁和验证流程接入；不得用外部库绕开项目统一入口或复制一套平行实现。
- 修改后必须同步更新代码、配置、文档、示例、测试、构建脚本和运行手册中的相关引用。
- 修改后必须运行与变更范围匹配的构建、测试或静态检查；无法运行时必须说明原因和风险。
- 大规模重构、发布候选或拆分 PR 前必须运行工作树收敛检查，确认没有本地配置、根级运行态目录、生成目录或测试报告混入交付面。

## 配置优先

- 可变业务策略、品牌标识、产品维度、平台维度、认证安全策略、会话并发策略、Cookie/CSRF/header 名称、缓存开关、缓存 TTL、运行时默认值和部署差异不得硬编码在业务代码、前端页面、store、handler 或 service 中。
- 上述可变项必须进入配置结构、默认配置、示例配置、环境变量覆盖、route contract、受控注册表或系统配置管理。
- 根目录 README、项目 Logo 和仓库叙事可以保留项目代号；该例外不适用于运行时代码、配置默认值、API、日志、错误信息、前端生产文案或模块命名。
- 后端新增或修改配置项时，必须同步 `backend/internal/config`、配置默认值、`backend/configs/*.example.yaml`、`backend/configs/examples/*.example.yaml`、`backend/deploy/config.production.example.yaml`、后端 system locale、相关文档和测试。
- `backend` 的 `brand.productCode` 是主平台默认产品码来源；产品线、客户端类型、平台类型、组织上下文和缓存 key 维度必须通过配置、请求上下文或 contract 传递。
- 稳定协议值、HTTP 方法、数据库列名、迁移回填值、枚举类型、错误码、编译期 contract 标识和包内私有常量可以保留在代码中，但不得承载可运营、可部署、可品牌化或可按产品线变化的策略。

## 后端架构边界

- `backend/cmd/console` 是进程入口和命令声明，应保持轻薄。
- `backend/internal/app` 是应用装配根，负责生命周期、重载、启动和依赖注入。
- `backend/internal/modules` 是业务模块目录；现有模块保持 `model`、`repository`、`service`、`handler` 包名。
- `service` 定义自己需要的最小接口，不导入 `pkg` 具体实现、`internal/app` 或同模块 `repository` 实现。
- `handler` 只做输入输出适配，不承载业务规则。
- `repository` 和模块 `infrastructure` 实现 service-local contract，并隔离 ORM、SQL、缓存、存储和外部协议细节。
- 新增后端模块必须显式接入 `backend/internal/app/initapp`、HTTP route contract、前端 API client、页面、i18n、测试和文档；执行步骤以 `backend/docs/extension/module-blueprint.md` 为准。
- `backend/pkg` 只封装可复用基础设施能力，不能依赖 `backend/internal/app` 或 `backend/internal/modules`。
- `backend/types` 只承载平台级常量、错误和结果封装；业务 DTO、缓存 key、executor pool 名称和模块枚举应留在对应模块或基础设施包内。

## 错误、结果与状态

- 后端 API 使用 `backend/types/result` 的统一响应结构；handler 不得返回散落格式或裸字符串错误。
- 用户可见错误必须使用稳定 i18n `messageKey`，字段级错误必须通过 `messageArgs` 保留字段上下文。
- service 和 `pkg` 必须返回错误、结果和状态，由上层决定重试、降级、日志或响应；日志不能替代错误返回。
- best-effort 清理、缓存降级或输出失败可以不阻断主流程，但必须不影响业务正确性，并在代码或文档中说明影响边界。
- 生产 Go 代码中显式忽略错误、关闭、删除、写入、同步、发送或停止等结果时，必须优先返回错误或状态；确属 best-effort 的例外必须进入 `backend/scripts/check-error-result-boundaries.ps1` allowlist 并写明业务影响。
- `backend/types/errors` 只允许平台级通用错误码；用户、角色、菜单、公告等模块私有错误必须留在模块内，通过 handler 映射为通用错误码和稳定 `messageKey`。
- 前端统一通过所属项目的 API client 和错误归一化逻辑消费请求错误，不得在页面里重复实现不一致的错误处理。

## HTTP 与 OpenAPI

- `backend/internal/transport/http/contracts.go` 是主系统 HTTP route contract registry，是真实路由注册、`system_apis` catalog、权限同步和 `backend/docs/api/openapi.yaml` 生成的单一事实来源。
- 新增或修改主系统 HTTP API 时，必须在同一份 route contract 中声明 method、Gin 风格 path、访问级别、权限、summary、请求/响应 DTO 和参数。
- 新增或修改后台菜单项时，如果菜单项配置 `permission`，必须同时配置合法 `scope`，并确保该权限能从 route contract 派生的 API catalog 中找到同 `productCode + scope + permission` 的声明；不得只在菜单中孤立添加权限码。
- 主系统 API handler 使用的请求体 DTO 必须是稳定 Go 类型；普通新增 API 不得使用匿名请求结构或随意的 `map[string]any`。
- `backend/docs/api/openapi.yaml` 是生成产物，禁止手写维护；变更 route contract 后必须在 `backend/` 内运行 `go run ./cmd/console api openapi --output docs/api/openapi.yaml`。
- `GET /openapi.yaml` 是公开运行时契约接口，不进入 `/api/v1` API catalog、权限同步、操作记录或 SPA fallback。

## 后台 React 前端

本节只在任务触碰 `backend/web/app/**` 或后端 React WebUI 交付面时生效。

- `backend/web/app` 是 React 统一前端，覆盖公开页面、首次安装向导和 `/admin` 后台。
- React 后台 API 统一通过 `backend/web/app/app/lib/api` 的 endpoint 表和 API client，不要散落新的 `/api/v1` 字符串。
- 首次安装向导必须位于 `/setup/*`，安装步骤、字段、驱动、选项、测试能力和完成状态必须来自后端 setup schema 与 status API。
- 用户可见文案必须维护在 locale 资源中，不要在页面、组件、store、配置、表单 schema、表格列或 SEO helper 中硬编码展示文本。
- 前后端 canonical locale 统一为 `zh-CN`、`en-US`；API client 直接透传当前 locale 到 `X-Locale`。locale 入口负责把浏览器语言、本地存储值和外部输入归一化到 canonical locale，资源目录、后端 locale 和 API 传递保持单线。
- 可见 UI 变更必须保持响应式、可访问焦点、键盘操作、触控尺寸、文本对比度和 `prefers-reduced-motion` 支持。

## Nuxt 前端规则

本节只在任务触碰 `frontend/**`、前端视觉/交互/i18n/API/mock/构建，或用户明确要求开发前端时生效。

- `frontend/` 使用 Nuxt 4、Vue 3、TypeScript、Pinia、`@nuxtjs/i18n`、`@nuxt/icon`、Material Web、本地 Aoi wrapper 和 pnpm；页面路由以社区产品体验、内容消费和用户业务流程为主。
- `frontend/` 的登录、注册、资料库、通知、上传和设置只使用普通社区账号语义；账号 DTO、Pinia store、mock fixture、页面文案和 i18n 只暴露 `userId`、`sessionId`、`account`、`handle`、`displayName` 等社区字段。
- 包管理器只能使用 pnpm，版本由 `frontend/package.json` 的 `packageManager` 固定；不得引入 npm、Yarn 或 Bun lockfile。
- 业务页面和功能组件不得直接使用 `md-*` Material Web 元素；需要新能力时先扩展 `frontend/app/components/aoi/`。
- Material Web 的注册与行为必须保持在 Aoi wrapper 和 `frontend/app/plugins` 后面，不得在业务页面散落实现细节。
- 普通文本链接、卡片链接、标签链接和导航链接统一使用 `AoiLink`；按钮式链接使用 `AoiButton` 或 `AoiIconButton` 的 `to` / `href`。
- 样式优先使用 `frontend/app/assets/css/tokens.css` 中的 CSS 变量和 `frontend/app/assets/css/main.css` 中的共享布局规则；不要在页面里制造孤立色值、尺寸或动效。
- `frontend/app/composables/useAoiApi.ts` 和 `useAoiApiTelemetry()` 是前端 API 与诊断入口；mock API、shared DTO 和 fixture 应贴近未来后端契约并清楚标记 mock 边界。
- 浏览器本地 store 必须只在客户端安全 hydrate，并能从损坏的 `localStorage` 恢复；不得把凭据、私有 payload、文件字节或不可恢复的大对象写入持久化存储。
- 上传草稿状态不要持久化文件字节，只保存文件元数据。
- 新增共享用户可见文案时，同步维护 `frontend/i18n/locales/zh-CN.json`、`frontend/i18n/locales/en.json` 和 `frontend/i18n/locales/ja.json`。
- 项目说明、开发约定和架构资料分别维护在根 `AGENTS.md`、后端 `backend/docs/**` 或对应 README；`frontend/` 只维护运行态页面、组件、样式、状态、API 接入和测试资料。
- 可见 UI 变更必须检查桌面和移动端，至少覆盖 `1440x900` 与 `390x844` 或说明无法检查的原因。
- 当前 `frontend/` 没有提交 lint 脚本；除非后续新增脚本或明确提供命令，不得声称已完成 lint 验证。

## 前端视觉与组件体系

本节只在任务触碰 `frontend/**` 或 `backend/web/app/**` 的可见 UI、组件、样式、设计 token、交互和视觉 QA 时生效。

- 后台页面使用密度适中的管理界面：稳定导航、标题区、筛选、表格、分页、弹窗/抽屉和明确状态。
- 视频社区前端使用清晰内容层级、稳定媒体比例、可扫描的信息布局、低干扰动效和可靠的播放器/弹幕/富文本交互。
- 不使用装饰性渐变球、玻璃拟态堆叠、大型营销卡片或后台工作流里的 stock-like 图片。
- 文本必须安全适配中文、英文和日文；长英文单词、URL、代码片段和按钮文案要安全换行。
- 图标控件必须有可访问名称；交互元素支持键盘、`:focus-visible`、触控尺寸和 `prefers-reduced-motion`。
- 对话框、菜单、浮层、播放器控制、上传、裁剪、富文本和设置页必须具备加载、空状态、错误、禁用和恢复路径。

## 模块化扩展边界

- 后端业务扩展统一落在 `backend/internal/modules`、`backend/internal/app/initapp`、route contract、API catalog、权限、前端 API client、页面、i18n、测试和文档同步链路。
- 受控配置示例、部署示例、前端生产 API 和文档教程只描述模块化扩展入口、系统配置和公开 HTTP contract。
- 跨模块共享能力先沉淀到稳定基础设施、平台 contract 或受控注册表，不在业务模块之间复制运行时协议、权限模型或管理页面。

## 文档约定

- 文档应描述当前行为，而不是未来愿望。未来能力或缺失能力写入合适的 backlog、known gaps 或任务计划文档。
- 文档、注释、README 和长期规则以中文为主；保留具体命令、文件路径和已验证事实。
- 文档、规则、skill 和说明统一采用当前架构态表达；约束边界时直接写当前入口、模块路径、配置来源、数据来源和验证命令，避免把来源回溯式说明写成长期规则。
- 如果终端输出出现乱码，先用 UTF-8 或原始字节检查文件，再重写文档。
- 所有关键代码实现应具备 README 或说明文档，方便未来开发者快速理解和使用。
- `frontend/` 的长期前端规则统一维护在本文件；前端目录内只保留与运行态实现直接相关的页面、组件、样式、状态、API 与测试资料。

## Skill 与 Agent 配置

- 根目录 `.agents/skills` 是本聚合仓库的主 skill 入口，覆盖后端维护、构建 CI、文档治理、模块开发、API 契约、WebUI/i18n、视觉 QA、提交规范和通用前端/设计技能。
- `backend/.agents/skills` 是导入后端源码自带的上游副本；在本聚合仓库执行任务时优先使用根目录 `.agents/skills`。
- README/AGENTS/docs/skill 元数据治理使用 `.agents/skills/aoi-admin-docs-governance`；阶段任务计划、进度追踪、验收证据索引和 PR 拆分计划使用 `.agents/skills/aoi-admin-task-planning`。
- 后端平台化重构、最终验收审计、模块化扩展、扩展边界治理、README/AGENTS/docs 同步或发布前 readiness 任务，优先使用 `.agents/skills/aoi-admin-platform-maintenance`。
- 构建系统、GitHub Actions、Dockerfile、发布包脚本、`backend/scripts/check-*.ps1`、`backend/scripts/release-preflight.ps1` 和质量门禁变更使用 `.agents/skills/aoi-admin-build-ci-governance`。
- 新增业务模块使用 `.agents/skills/aoi-admin-module-development`；IAM 认证、权限、菜单、会话、审计和通知链路变更使用 `.agents/skills/aoi-admin-iam-governance`；HTTP API/权限/OpenAPI 变更使用 `.agents/skills/aoi-admin-api-contract-sync`。
- React WebUI/i18n 变更使用 `.agents/skills/aoi-admin-webui-i18n`；可见 UI 截图、视觉 QA、响应式验收和页面证据使用 `.agents/skills/aoi-admin-visual-qa-governance`。
- `frontend/` 的 Nuxt/Vue 页面、组件、交互、视觉和内容工作可使用 `.agents/skills/frontend-implementation`、`.agents/skills/design-system`、`.agents/skills/web-quality-check`、`.agents/skills/soft-modular-product-ui`、`.agents/skills/saas-dashboard-ux`、`.agents/skills/seo-content` 或 `.agents/skills/testing-qa`，但必须先遵守本文件的 `frontend/` 条件规则。
- 新增或修改 `.agents/skills`、skill 元数据或 Agent 规则时，必须运行 `powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1`。

## 运行、构建、测试与检查

后端常用命令在 `backend/` 内运行：

```powershell
Push-Location backend
go run ./cmd/console server --config=configs/config.example.yaml
go build -mod=readonly -o ./tmp/console-server ./cmd/console
go run ./cmd/console api openapi --output docs/api/openapi.yaml
go test ./internal/config -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go test ./... -count=1 -mod=readonly
go vet ./...
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
Pop-Location
```

后端 React 前端命令从聚合根运行：

```powershell
pnpm --dir backend/web/app typecheck
pnpm --dir backend/web/app lint:i18n
pnpm --dir backend/web/app test
pnpm --dir backend/web/app test:e2e
pnpm --dir backend/web/app build
```

Nuxt 前端命令从聚合根运行：

```powershell
pnpm --dir frontend typecheck
pnpm --dir frontend build
pnpm --dir frontend dev
pnpm --dir frontend preview
powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-boundary.ps1
```

聚合仓库规则与 skill 检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
git diff --check
```

聚焦变更时，先运行最近包或子系统的测试；跨 package、配置、HTTP、数据库、共享类型、WebUI 静态托管或构建路径时运行完整测试套件。

## 提交前与发布前检查

- 提交或创建 PR 前必须运行 `git status --short` 和 `git diff`，确认没有混入无关文件、用户改动、运行态数据、本地配置或生成目录。
- 自动提交前必须只暂存本次任务相关文件，不得使用未经审查的 `git add .`；若存在无关用户改动、验证失败、密钥/本地配置/运行态数据混入、合并冲突或用户要求不提交，必须停止自动提交并说明原因。
- 提交信息必须遵循 Conventional Commits：`<type>(<scope>): <subject>`。允许的 `type` 包括 `feat`、`fix`、`refactor`、`docs`、`test`、`build`、`chore`、`style`；`subject` 使用英文祈使句，不以句号结尾。
- 涉及入口、模块路径、二进制名、Docker、CI、发布包、部署脚本或品牌默认值时，必须运行 `backend/scripts/check-entry-brand-convergence.ps1`。
- 涉及模块扩展边界、受控配置示例、前端后台入口或生产交付面 API 路径时，必须运行 `backend/scripts/check-plugin-removal.ps1`。
- 涉及 service、repository、infrastructure、`pkg`、CLI 运行态、清理逻辑或错误/结果返回规则时，必须运行 `backend/scripts/check-error-result-boundaries.ps1`，确认没有新增无说明的吞错或忽略状态。
- 当前机器无法运行 Docker 或 Bash 时，不得宣称容器构建和容器烟测已完成；必须在目标环境或 CI 使用后端 smoke 脚本或 CI 补证。

## 输出要求

完成涉及修改的任务后，最终输出必须包含：问题原因、修改文件、删除内容、最终设计、验证结果。不得只说明“已修复”或“已完成”。
