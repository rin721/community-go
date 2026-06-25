# Agent Rules：项目级规则

本文件是当前后台管理 / 控制台平台仓库的项目级长期规则。所有开发、重构、修复、初始化、配置、CLI、WebUI、runtime、文档、测试和工程治理任务都必须遵守本文件。开发文档入口为 `docs/README.md`。

## 适用范围

- 本规则适用于本项目所有代码、配置、脚本、文档、示例、测试、构建、部署和运行态资料。
- 根目录 `AGENTS.md` 是项目级 Agent 规则唯一入口；子目录规则只能补充局部约束，不得覆盖或削弱本文件。
- 若任务要求与本规则冲突，必须先指出冲突并确认处理方式。

## 产品定位

- 本项目是可运行、可扩展、可二次开发的开源后台管理 / 控制台平台底座。
- 主平台统一承载账号、权限、组织租户、配置、审计日志、API catalog、媒体、版本、系统管理、初始化和基础运营能力。
- 未来业务扩展统一通过 `internal/modules` 新增模块，不再以插件系统作为主要扩展方式。
- 公开站点、首次安装向导、`/admin` 后台、文档、组件体系和质量工具都必须服务该定位。
- 不得在前端凭空实现后端尚未暴露的生产能力。

## 强制规则

- 不保留旧产物、旧入口、旧字段、旧示例、旧文档、旧逻辑、旧兼容层、deprecated 设计或临时过渡方案。
- 发现废弃设计后，必须迁移到当前设计并删除旧实现，不允许新旧双轨并存。
- CLI、WebUI、runtime、配置加载和初始化流程不得各自维护重复逻辑；共享行为必须收敛到统一实现。
- 修改代码前必须分析现状、调用链、依赖关系和影响边界；不得基于猜测修改代码。
- 修改后必须清理代码、配置、文档、示例、测试、构建脚本和运行手册中的相关旧引用。
- 修改后必须运行与变更范围匹配的构建、测试或静态检查；无法运行时必须说明原因和风险。
- 大规模重构、发布候选或拆分 PR 前必须运行工作树收敛检查，确认没有本地配置、根级运行态目录、生成目录或测试报告混入交付面。

## 配置优先

- 可变业务策略、品牌标识、产品维度、平台维度、认证安全策略、会话并发策略、Cookie/CSRF/header 名称、缓存开关、缓存 TTL、运行时默认值和部署差异不得硬编码在业务代码、前端页面、store、handler 或 service 中。
- 上述可变项必须进入配置结构、默认配置、示例配置、环境变量覆盖、route contract、受控注册表或系统配置管理。
- 根目录 `README.md` 可以保留项目代号、徽章、Logo 和仓库品牌叙事；该例外不适用于运行时代码、配置默认值、API、日志、错误信息、前端生产文案或模块命名。
- 新增或修改配置项时，必须同步 `internal/config`、配置默认值、`configs/*.example.yaml`、`configs/examples/*.example.yaml`、`deploy/config.production.example.yaml`、后端 system locale、相关文档和测试。
- `brand.productCode` 是主平台默认产品码来源；产品线、客户端类型、平台类型、组织上下文和缓存 key 维度必须通过配置、请求上下文或 contract 传递。
- 稳定协议值、HTTP 方法、数据库列名、迁移历史回填值、枚举类型、错误码、编译期 contract 标识和包内私有常量可以保留在代码中，但不得承载可运营、可部署、可品牌化或可按产品线变化的策略。

## 架构边界

- `cmd/console` 是进程入口和命令声明，应保持轻薄。
- `internal/app` 是应用装配根，负责生命周期、重载、启动和依赖注入。
- `internal/modules` 是业务模块目录；现有模块保持 `model`、`repository`、`service`、`handler` 包名。
- `service` 定义自己需要的最小接口，不导入 `pkg` 具体实现、`internal/app` 或同模块 `repository` 实现。
- `handler` 只做输入输出适配，不承载业务规则。
- `repository` 和模块 `infrastructure` 实现 service-local contract，并隔离 ORM、SQL、缓存、存储和外部协议细节。
- 新增模块必须显式接入 `internal/app/initapp`、HTTP route contract、前端 API client、页面、i18n、测试和文档；执行步骤以 `docs/extension/module-blueprint.md` 为准。
- `pkg` 只封装可复用基础设施能力，不能依赖 `internal/app` 或 `internal/modules`。
- `types` 只承载平台级常量、错误和结果封装；业务 DTO、缓存 key、executor pool 名称和模块枚举应留在对应模块或基础设施包内。

## 错误、结果与状态

- 后端 API 使用 `types/result` 的统一响应结构；handler 不得返回散落格式或裸字符串错误。
- 用户可见错误必须使用稳定 i18n `messageKey`，字段级错误必须通过 `messageArgs` 保留字段上下文。
- service 和 `pkg` 必须返回错误、结果和状态，由上层决定重试、降级、日志或响应；日志不能替代错误返回。
- best-effort 清理、缓存降级或输出失败可以不阻断主流程，但必须不影响业务正确性，并在代码或文档中说明影响边界。
- 生产 Go 代码中显式忽略错误、关闭、删除、写入、同步、发送或停止等结果时，必须优先返回错误或状态；确属 best-effort 的例外必须进入 `scripts/check-error-result-boundaries.ps1` allowlist 并写明业务影响。
- `types/errors` 只允许平台级通用错误码；用户、角色、菜单、公告等模块私有错误必须留在模块内，通过 handler 映射为通用错误码和稳定 `messageKey`。
- 前端统一通过 `ApiError` 消费请求错误，不得在页面里重复实现不一致的错误归一化逻辑。

## HTTP 与 OpenAPI

- `internal/transport/http/contracts.go` 是主系统 HTTP route contract registry，是真实路由注册、`system_apis` catalog、权限同步和 `docs/api/openapi.yaml` 生成的单一事实来源。
- 新增或修改主系统 HTTP API 时，必须在同一份 route contract 中声明 method、Gin 风格 path、访问级别、权限、summary、请求/响应 DTO 和参数。
- 新增或修改后台菜单项时，如果菜单项配置 `permission`，必须同时配置合法 `scope`，并确保该权限能从 route contract 派生的 API catalog 中找到同 `productCode + scope + permission` 的声明；不得只在菜单中孤立添加权限码。
- 主系统 API handler 使用的请求体 DTO 必须是稳定 Go 类型；普通新增 API 不得使用匿名请求结构或随意的 `map[string]any`。
- `docs/api/openapi.yaml` 是生成产物，禁止手写维护；变更 route contract 后必须运行 `go run ./cmd/console api openapi --output docs/api/openapi.yaml`。
- `GET /openapi.yaml` 是公开运行时契约接口，不进入 `/api/v1` API catalog、权限同步、操作记录或 SPA fallback。

## 前端与 i18n

- `web/app` 是 React 统一前端，覆盖公开页面、首次安装向导和 `/admin` 后台。
- React 后台 API 统一通过 `app/lib/api` 的 endpoint 表和 API client，不要散落新的 `/api/v1` 字符串。
- 首次安装向导必须位于 `/setup/*`，安装步骤、字段、驱动、选项、测试能力和完成状态必须来自后端 setup schema 与 status API。
- 用户可见文案必须维护在 locale 资源中，不要在页面、组件、store、配置、表单 schema、表格列或 SEO helper 中硬编码展示文本。
- 前后端 canonical locale 统一为 `zh-CN`、`en-US`；API client 直接透传当前 locale 到 `X-Locale`。只能在 locale 入口保留浏览器语言或旧本地值归一化，不得恢复 `en` 资源目录、后端 locale 或 API 传递双轨。
- 可见 UI 变更必须保持响应式、可访问焦点、键盘操作、触控尺寸、文本对比度和 `prefers-reduced-motion` 支持。

## 插件系统

- 远程插件运行时、插件协议、插件示例、插件配置块、插件管理页面和插件权限已从当前架构移除。
- 不得新增 `internal/plugin`、`pkg/plugin`、`pkg/pluginapi`、`_examples/remote-plugins`、`docs/api/plugin-protocol` 或 `/api/v1/plugins`。
- 受控配置示例、部署示例、前端生产 API 和文档教程不得恢复插件配置块、插件 API 路径或插件协议兼容层；被忽略的本地派生配置不作为交付事实。
- 未来扩展统一通过模块化路线实现：模块代码、应用装配、route contract、前端 API client、页面、i18n、测试和文档同步更新。

## 文档约定

- 文档应描述当前行为，而不是未来愿望。未来能力或缺失能力写入 `docs/backlog/known-gaps.md`。
- 文档、注释、README 和长期规则以中文为主；保留具体命令、文件路径和已验证事实。
- 如果终端输出出现乱码，先用 UTF-8 或原始字节检查文件，再重写文档。
- 所有关键代码实现应具备 README 或说明文档，方便未来开发者快速理解和使用。

## 运行、构建、测试与检查

```powershell
go run ./cmd/console server --config=configs/config.example.yaml
go build -mod=readonly -o ./tmp/console-server ./cmd/console
go run ./cmd/console api openapi --output docs/api/openapi.yaml
go test ./internal/config -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go test ./... -count=1 -mod=readonly
go vet ./...
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
pnpm --dir web/app test
pnpm --dir web/app test:e2e
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
git diff --check
```

聚焦变更时，先运行最近包或子系统的测试；跨 package、配置、HTTP、数据库、共享类型、WebUI 静态托管或构建路径时运行完整测试套件。

## 提交前与发布前检查

- 提交或创建 PR 前必须运行 `git status --short` 和 `git diff`，确认没有混入无关文件、用户改动、运行态数据、本地配置或生成目录。
- 仓库级平台化重构、最终验收审计、模块化扩展、插件移除防回潮、README/AGENTS/docs 同步或发布前 readiness 任务，必须优先使用项目 skill `.agents/skills/aoi-admin-platform-maintenance`。
- 开源可复用性、品牌叙事例外、文档入口、最终验收差距和 readiness 证据治理使用 `.agents/skills/aoi-admin-open-source-readiness`。
- README/AGENTS/docs/skill 元数据治理使用 `.agents/skills/aoi-admin-docs-governance`；阶段任务计划、进度追踪、验收证据索引和 PR 拆分计划使用 `.agents/skills/aoi-admin-task-planning`。
- 构建系统、GitHub Actions、Dockerfile、发布包脚本、`scripts/check-*.ps1`、`scripts/release-preflight.ps1` 和质量门禁变更使用 `.agents/skills/aoi-admin-build-ci-governance`。
- 新增业务模块使用 `.agents/skills/aoi-admin-module-development`；IAM 认证、权限、菜单、会话、审计和通知链路变更使用 `.agents/skills/aoi-admin-iam-governance`；HTTP API/权限/OpenAPI 变更使用 `.agents/skills/aoi-admin-api-contract-sync`。
- 首次安装、统一初始化中心、Setup API、CLI init、setup token 和 `/setup` 向导变更使用 `.agents/skills/aoi-admin-setup-flow-governance`；系统配置、参数、字典、操作记录、媒体、版本包、流量探针和后台运维能力变更使用 `.agents/skills/aoi-admin-system-ops-governance`。
- 插件残留删除和模块化迁移防回潮使用 `.agents/skills/aoi-admin-plugin-removal`；React WebUI/i18n 变更使用 `.agents/skills/aoi-admin-webui-i18n`。
- 发布验收/部署证据使用 `.agents/skills/aoi-admin-release-readiness`；CLI、运行时生命周期、托管服务、探针和烟测链路变更使用 `.agents/skills/aoi-admin-runtime-cli-governance`；可观测性、探针、日志、运行证据和发布后观察使用 `.agents/skills/aoi-admin-observability-ops`。
- 错误、结果、状态返回、API 响应和前端请求错误治理使用 `.agents/skills/aoi-admin-error-result-governance`；数据库迁移、GORM 模型、仓储、示例数据和演示数据变更使用 `.agents/skills/aoi-admin-data-migration-governance`。
- 新开发者入门、本地启动、首次安装向导、演示数据和 onboarding smoke 使用 `.agents/skills/aoi-admin-dev-onboarding`；可见 UI 截图、视觉 QA、响应式验收和页面证据使用 `.agents/skills/aoi-admin-visual-qa-governance`；本地 diff、PR、合并前风险和审查反馈使用 `.agents/skills/aoi-admin-pr-review-governance`。
- 安全敏感配置、依赖升级、漏洞扫描、密钥治理、供应链检查、HTTP 安全头、CORS/CSRF/Cookie 策略变更使用 `.agents/skills/aoi-admin-security-dependency-governance`。
- 新增或修改 `.agents/skills`、skill 元数据、Agent 规则或发布前 readiness 文档时，必须运行 `scripts/check-agent-skills.ps1`，确保 `SKILL.md` front matter、仓库级 `agents/openai.yaml` 和默认触发提示保持可用。
- 新增或调整重要目录、目录 README、文档入口或 README 覆盖规则时，必须运行 `scripts/check-doc-readmes.ps1`，确保应用入口、文档、后端分层、模块、工具库、全局类型和 React 前端关键目录都有非空说明。
- 新增或调整 README、`docs/**`、仓库级 skill、任务计划、发布说明、目录索引或关键源码目录说明中的相对链接时，必须运行 `scripts/check-doc-links.ps1`，确保文件、目录和 Markdown 锚点目标仍可访问。
- 每次任务结束时，如果本次任务修改了文件且用户未明确要求不提交，必须使用项目 skill `.agents/skills/git-conventional-commit` 收敛工作区，并按 Conventional Commits 自动创建提交。
- 自动提交前必须只暂存本次任务相关文件，不得使用未经审查的 `git add .`；若存在无关用户改动、验证失败、密钥/本地配置/运行态数据混入、合并冲突或用户要求不提交，必须停止自动提交并说明原因。
- 提交信息必须遵循 Conventional Commits：`<type>(<scope>): <subject>`。允许的 `type` 包括 `feat`、`fix`、`refactor`、`docs`、`test`、`build`、`chore`、`style`；`subject` 使用英文祈使句，不以句号结尾。
- 首次接手仓库、准备发布候选或调查环境缺证时，应运行 `scripts/check-local-tooling.ps1`；发布包或 CI artifact 校验需要 `-RequireReleaseTools`，容器补证需要 `-RequireDocker` 或 `-RequireBash`。
- 涉及入口、模块路径、二进制名、Docker、CI、发布包、部署脚本或品牌默认值时，必须运行 `scripts/check-entry-brand-convergence.ps1`。
- 涉及插件删除边界、模块扩展路线、受控配置示例、前端后台入口或生产交付面 API 路径时，必须运行 `scripts/check-plugin-removal.ps1`。
- 涉及 service、repository、infrastructure、`pkg`、CLI 运行态、清理逻辑或错误/结果返回规则时，必须运行 `scripts/check-error-result-boundaries.ps1`，确认没有新增无说明的吞错或忽略状态。
- 涉及 `scripts/package.py`、发布包 README/manifest、CGO、SQLite 运行态或发布包数据库边界时，必须运行 `scripts/check-package-sqlite-boundary.ps1`；该脚本只证明 dry-run 和包元数据边界，不替代目标平台 `--cgo` SQLite smoke。
- 阶段收口必须运行 `scripts/check-worktree-convergence.ps1`；发布边界需要干净工作树时使用 `scripts/check-worktree-convergence.ps1 -FailOnDirty`。
- 发布候选必须优先运行 `scripts/release-preflight.ps1`；需要完整证据时按风险增加 `-Full`、`-IncludePackage`、`-IncludeRuntimeSmoke`、`-IncludeVisualQA` 和 `-IncludeDocker`。
- 发布证据应从 `docs/release/release-evidence-template.md` 复制，并通过 `scripts/check-release-evidence.ps1 -Path <发布证据文件>` 校验；不得把未执行、空占位或明文密钥写成通过。
- 当前机器无法运行 Docker 或 Bash 时，不得宣称容器构建和容器烟测已完成；必须在目标环境或 CI 使用 `scripts/docker-smoke.ps1` 或 `scripts/docker-smoke.sh` 补证。

## 输出要求

完成涉及修改的任务后，最终输出必须包含：问题原因、修改文件、删除内容、最终设计、验证结果。不得只说明“已修复”或“已完成”。
