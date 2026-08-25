# WebUI 开发指南

WebUI 基线由 `internal/composition` 统一装配，模块只在确有浏览器界面需求时提供 `binding/webui`。IAM 提供首次设置、登录、账号安全、用户、角色、权限与会话管理页面和离线密码重置 CLI；Organization 提供组织目录页面；Auth 提供低敏审计日志页面；Navigation 提供已注册菜单策略页面；Ops 提供真实 management build/probe/diagnostics/metrics 看板；Todo 没有 WebUI Binding。

IAM 用户/角色页与 Organization 部门/岗位/分配页、Navigation 菜单页的写操作按钮（创建/启停/重置/改名/归档/保存策略等）经模块 Binding `ActionPermissions` 与 SDK `ActionTrigger` 接入既有动作级权限投影（066）：denied 时按钮隐藏或禁用，未声明/未投影的 operation 前端不做呈现限制，服务端授权继续 fail closed；账号/角色列表支持关键字过滤与分页，角色权限与账号角色保存遇到 409 时展示 added/removed 差异并重新加载最新版本，组织分配使用 `expectedVersion` 乐观锁。

审计查询页（`/admin/audit`，Auth owner）与账号会话管理页（`/admin/sessions`，IAM owner，归入「身份与权限管理」组）属于 064/065 能力：两者都只呈现低敏/摘要数据（审计 subject/resource 为哈希，会话仅 IDHash 摘要），并通过 `auth:audit:read` / `iam:session:read|revoke` 权限键投影访问状态；审计页支持按 operation/action/resourceType/outcome 筛选（065，含业务写操作审计事件）；页面不修改宿主，遵循模块接入四步。

## 适用语境与当前门禁范围

新增或修改模块页面、Route、Navigation、WebUI Binding、locale、SDK requirement、宿主公共交互、全局样式、Session/CSRF、availability/access 状态或生成 registry 时，都必须使用本指南。任务是否写出“WebUI 模块”不是判定条件；只要浏览器可见行为、模块资源加载或宿主/模块边界发生变化，就已经命中。仓库布局以 `.scaffold/layout.json` 为唯一构建期声明；不要在工具中复制 `webui`、`internal/module` 或生成输出路径。

当前门禁覆盖必须按实际实现理解：

| 规范 | 当前证据 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| Binding、Activation、Delivery、SourcePath、locale coverage 与 registry | Go Catalog/生成器测试和 `pnpm generate:check` | composition 已选择的模块及独立 fixture 能通过通用 Go 契约 | 未进入 composition 的目录自动成为模块 |
| SDK import、宿主/模块 import 与全局样式 | `pnpm lint:architecture` | 宿主目录与所有实际存在的 WebUI 模块目录 | 未执行 E2E、视觉或外部服务验收 |
| 模块 ESLint | `pnpm lint:modules` | 所有实际存在的 `binding/webui/web` 源码 | 运行时页面状态与浏览器兼容性 |
| 强制 i18n | `pnpm lint:i18n`、Go locale 校验、前端测试 | 所有实际存在的 WebUI 模块页面源码和已注册 locale | 未执行 E2E、视觉或外部服务验收 |
| 运行时 access/availability/资源隔离 | Vitest 与 Playwright E2E | 测试包含的状态、页面和请求 | 未执行 E2E、未查看截图或未覆盖的新页面已经验收 |

因此，新增 `internal/module/<name>/binding/webui/web` 时，三个 Node 扫描脚本会自动发现该目录并纳入检查；仍必须提供一个故意违规会失败的反向 fixture 或等价证据，再运行完整检查。命令通过只证明静态检查覆盖了当前目录，不替代运行时、E2E 或视觉验收。

## 运行与生成

本地启动后端、Vite 与首次设置的完整步骤见 [WebUI 本地启动指南](../getting-started/webui.md)。以下命令用于开发前检查 registry 和前端构建，不替代启动顺序。

在仓库根目录执行：

```powershell
go run ./cmd/app webui generate
cd webui
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e -- --workers=1
pnpm generate:check
```

跨平台静态质量总入口为仓库根的 `./scripts/Verify-WebUI.ps1` 或 `bash scripts/verify-webui.sh`，它固定执行生成检查、冻结安装、lint、模块 lint、typecheck、test 和 build；不启动 Go 服务或 Playwright。

## 托管模式与产物装配

WebUI 构建产物由托管前构建脚本统一装配，`config.yaml` 的 `webui.hosting` 声明托管目录（默认 `webui/dist`）与脚本路径/运行时（默认 node：`webui/scripts/build-webui.mjs`，Linux 可改用等价的 `build-webui.sh`）。脚本执行链：

```text
业务模块 WebUI 产物（registry 与 tsconfig，node scripts/generate.mjs + go run ./cmd/app webui generate）
 -> 依赖安装（corepack pnpm install --frozen-lockfile）
 -> 构建打包（corepack pnpm build -> webui/dist）
```

- 显式装配：`go run ./cmd/app webui build`（配置缺失时使用默认 node 脚本）。
- development 下产物缺失时，Service 启动前自动执行一次该脚本；reload 不重复构建。
- `logger.environment: production` 时缺产物快速失败；镜像构建期由 Dockerfile 的 `webui-build` stage 装配 `webui/dist`，distroless runtime 不含 node，运行期不执行脚本。
- 托管目录/脚本默认值与布局清单的一致性由 `project-layout --check-webui` 质量门禁守护；生产 Service 不运行期读取 `.scaffold/layout.json`。
- 静态托管只服务 GET/HEAD；`/api`、`/management` 前缀未命中保持 JSON 404/405，不回退 HTML；`/assets/*`（Vite hash 资源）使用不可变缓存头，`index.html` 与其余文件 `no-cache`；`AcceptJSON` 门禁只作用于 API 分组。
- 模式 B 下业务 listener 挂载受保护 management facade：`/management/{startupz,livez,readyz,build,diagnostics,metrics}`（GET）复用 management listener 同一 handler（`generation.opsModule.ManagementHTTP`，含 `middleware.Management` 预算与 Authenticate/Authorize/metricsAccess 语义），供托管 WebUI 的 Ops 页面（运行状态/能力清单）同源读取真实数据；未知子路径经 chi NotFound 保持 JSON 404，非 GET 保持 JSON 405。路径清单由 `internal/module/ops/binding/http.ManagementRoutePaths()` 单一导出，composition 与模块注册共用，禁止复制字面量。

## 数据源环境声明与 mock 数据源

WebUI 通过 `VITE_WEBUI_DATA_SOURCE`（`server-hosted` 默认 / `separated` / `mock`）显式声明数据源环境，值经 `webui/scripts/project-layout.mjs` 的 typed 解析器校验（非法值 dev/Playwright 启动前失败），客户端 `readWebUIDataSource()` 读取非法值回退默认 `server-hosted`。

- **mock 声明（全 WebUI mock）**：`webui/src/contracts` 的 `requestJSON`/`requestText` 切换到 `webui/src/mock/router.ts`（宿主 mock 传输层），不发起真实请求。
  - 宿主 mock（manifest/session/logout）在 `webui/src/mock/host.ts`；mock manifest 由 Go catalog 投影生成（`webuiMockManifest`，`catalogRevision` 与 `webuiRevision` 一致，宿主版本门禁天然通过）。
  - 模块 mock 数据**模块自有**：每个声明 Entry 的模块在 `binding/webui/web/mock.ts` 提供 `WebUIMockRoute[]`（复用模块 `api.ts` 类型），Binding 契约 `MockSource` 声明（Entry⇒必需），生成器输出 `webuiMockRegistry`；模块经 `@webui/sdk/mock`（SDK 能力 `mock`）使用路由类型。禁止在宿主集中维护业务模块的 mock 数据。
  - 宿主 shell 全局渲染“模拟环境 / Mock environment”徽标（`webui/src/components/shell/MockBadge.tsx`，host locale 双语），所有 mock 数据不冒充真实服务状态。
- **真实声明（默认/separated）**：传输层行为与现状一致（mock 绝不在未声明时启用）；Ops 数据层用 `resolveManagementSource()`（`internal/module/ops/binding/webui/web/environment.ts`）叠加可达性探测，全部不可达时显示“数据源不可达”双语横幅并保留重试，不伪造数字。
- 托管产物必须以默认或显式 `server-hosted` 构建；`webui/scripts/build-webui.mjs` 拒绝 `mock` 声明（mock 演示构建用普通 `pnpm build` + `.env.local`），防止演示产物进入托管/发布链。

`webui/` 是独立 React/Vite 宿主，开发服务器使用 HTTPS，并将 `/api/v1` 与 `/management` 代理到 Go 服务。开发 host、port 和两个 proxy target 由 `webui/.env.example` 对应的环境变量声明，Vite 与 Playwright 使用同一个 parser。生成 registry 的唯一来源是 `internal/composition` 的 WebUI Catalog；不要直接编辑 `src/generated/webui-registry.ts`。

IAM 用户密码可通过 `go run ./cmd/app iam reset-password --username <用户名>` 重置；未传 `--password` 时由 CLI 的安全输入接口读取。命令先验证 migration 兼容性，再更新密码、设置首次改密并撤销该账号全部 Session。

## 安全边界

- 公开 HTTP contract 使用 `none`、`bearerAuth`、`webuiSession` typed profile；IAM operation 使用 Session 来源，Todo 仍使用 Bearer/开发匿名来源。operation gate 只按 contract 选择来源，不读取 URL 前缀或 Cookie 名。
- Cookie 名为 `__Host-community-go_iam_session`，固定 `Secure`、`HttpOnly`、`SameSite=Lax`、`Path=/`，不设置 `Domain`。
- Session ID 和 CSRF token 使用 CSPRNG；数据库保存 SHA-256 摘要，浏览器只在内存保留 CSRF token。
- setup、login、logout 的不安全请求必须通过 `Origin` 校验；logout 还要求 `X-CSRF-Token`。
- CORS 与 IAM HTTP 必须消费同一候选中的 `http.cors.allowedOrigins`；空列表继续拒绝跨域，不能为本地开发建立通配例外。
- 页面菜单和 manifest 访问状态不构成授权；实际 operation 仍由服务端 Auth policy 决定。

模块页面只能依赖 `@webui/sdk/*` 和自身 API，不得导入宿主 Router、菜单、Session Store 或内部全局状态。新增页面时先修改模块 WebUI Binding，再运行生成检查。SDK 公开面按 runtime、http、i18n、query、navigation、ui、zone、feedback、mock 分包；禁止 `resolve/get`、万能 Context 和第三方 client 穿透。

模块样式必须放在模块自己的 `binding/webui/web/*.module.css`，页面根节点使用模块 CSS Module scope；宿主 `webui/src/styles.css` 只允许保留 reset、design token、Shell/platform 和公共 SDK UI 规则。业务 selector 不得回流宿主全局 CSS。`pnpm lint:architecture` 会按目录动态发现所有模块，但通过结果仍只覆盖当前源码和静态规则。

宿主 Shell 按 `webui/src/components/shell/*` 拆分：`AppSidebar`（品牌、递归菜单、移动抽屉语义）、`AppHeader`（topbar 与工具优先级）、`WorkspaceTabs`（已访问页签与 roving keyboard）、`AccountMenu`（账号 popover，统一 dismiss/focus）、`SidebarMenu`（递归菜单树与子菜单常驻 DOM）、`ShellSkeleton`/`PageSkeleton`（几何占位）。`AppShell` 保留现有公开 props，只负责 manifest/principal/logout 转宿主 view model 并协调 overlay、visited tabs 与 route content。平台样式 token（`--shell-*` 布局、`--z-*` 层级、`--motion-*` 时长与 easing、surface/border/radius/shadow/spacing）集中在 `styles.css` token 分区；前端侧同一个动效常量维护在 `webui/src/motion.ts`，overlay 四态状态机在 `webui/src/components/shell/overlay.ts`。reduced-motion 决策由 `webui/src/theme.ts` 合并显式偏好与系统 `prefers-reduced-motion`，最终落到 `data-motion` 供样式统一降级。

## 骨架分区注入点（zone）与交互规范

WebUI 以「骨架 + 注入点」承载业务模块的 UI 扩展（062）：骨架分区组件定义结构与视觉基调，模块通过类型化注入点向指定分区贡献内容，不修改骨架核心。分区注入点是源码/构建期静态插拔（Binding 声明 → 生成 `webuiZoneRegistry` → Manifest `zones` 投影 → 宿主懒加载），与 route 页面同轨。

### 分区与声明

| Zone | 骨架位置 | Binding 字段 |
| --- | --- | --- |
| `header-actions` | 顶栏操作区（全局快捷入口） | `HeaderActions` |
| `sidebar-panels` | 侧边栏辅助面板区 | `SidebarPanels` |
| `page-header` | 页面页头区（全局页头注入） | `PageHeaderItems` |
| `workspace-tabs` | 标签页栏操作区 | `WorkspaceTabActions` |
| `footer-status` | 底部状态栏 | `FooterStatusItems` |

zone 贡献的公共字段：`ID`（全局唯一）、`EntryID`（复用 `Binding.Entries` 的懒加载组件）、`TitleMessageID`（强制 locale 覆盖）、`OperationID`（可选动作权限钩子）、`Order`；有图标的 zone 同时声明 `IconID`（必须属于受控图标目录）。`Binding.ActionPermissions` 声明页面内动作的权限钩子（OperationID 集合）。所有 ZoneID、entry 归属、图标、kind、order 与数量上限都由 `validateBindings` 校验，未知状态 fail closed。

### Manifest 投影与权限

- `Manifest.zones` 只投影通过门禁的贡献：OperationID denied 不投影；availability 非 available 不投影（zone 不支持 degraded 部分能力）；无 OperationID 的贡献只受 availability 门禁。
- `Manifest.actionPermissions` 投影全部声明动作的从严 access（denied > authentication-required > allowed），`useActionAccess(operationId)` 据此控制页面触发器的呈现；未声明/未投影的 operation 前端不做呈现限制（服务端授权继续 fail closed）。
- 页面菜单、zone 与 action 的访问状态不构成授权；实际 operation 仍由服务端 Auth policy 决定。

### SDK zone 与宿主渲染

- `@webui/sdk/zone`（major 1）：`useZoneContributions(zone)`、`useActionAccess(operationId)`、`ZoneSlot`（消费宿主注入的渲染器）、`ZoneComponentProps`（模块 zone 组件只接收 `{ contribution, navigate }`）。
- 宿主在 `webui/src/zone/ZoneRenderer.tsx` 注入渲染器（`webui/src/zone/registry.ts` 是 zone lazy registry 的唯一装载点，只 import 生成产物）；单贡献错误由 zone 级边界隔离，不拖垮 Shell。
- 模块 zone 组件放在自身 `binding/webui/web/*.tsx`，样式走模块 CSS Module；只依赖 `@webui/sdk/*` 与自身 API。

### 交互状态链（`@webui/sdk/ui`）

所有可交互元素（按钮、链接、菜单项、标签项、卡片入口、弹窗触发器）统一状态模型：`idle(hover/focus/active) -> pending（防重复提交、aria-busy）-> success/failure 反馈（error code -> message ID）`，禁用按原因分类（permission/unavailable/busy/invalid）写入 `data-action-state`。

- `ActionTrigger`：统一触发原语，`operationId` 命中动作权限钩子（denied 默认隐藏，可配置为禁用），`onAction` 返回 Promise 时自动 pending，失败经 `onError` 走错误码 → message ID 链路（组件不内联业务文案）。
- `BulkActionBar`：数据表批量操作条（选中 N 项 → 确认弹窗 → pending 提交），与 `DataTable` 选择列联动。
- `FormSubmitActions`：表单提交/重置统一行为（pending、禁用原因、成功后由页面 owner 复位）。
- 菜单层级缩进使用 `--menu-indent-base`/`--menu-indent-step` token；祖先激活链、collapsed 语义与 059 动效/reduced-motion 决策保持一致。

### 图标目录

`iconId` 受控于宿主目录（Go `internal/webui/icons.go` 校验 authority + 前端 `webui/src/icon-catalog.ts` Lucide 映射），两侧一致性由 Go 测试守护；模块 Navigation/zone 只能声明目录内图标，自定义图标 entry 属于后续独立研究。

## 页面布局骨架与滚动/动效体验（067）

067 为全部业务模块页面建立了 TailAdmin 式平台布局骨架，并新增滚动体验运行时与派生配置设置。模块页面使用 `@webui/sdk/ui` 的平台原语，样式 authority 仍为 `webui/src/styles.css`。

### 布局骨架原语（`@webui/sdk/ui`）

| 原语 | 说明 |
| --- | --- |
| `PageSection`（区块卡片） | `kicker/title/description/actions` 卡头 + 卡体 + 可选 `footer`；内建弹入响应 |
| `StatGrid`/`StatCard` | KPI 统计行（图标可选 + 数值 + 标签 + 趋势），`columns` 驱动列数与响应式降列 |
| `DataCard` | 数据表格卡片：卡头（kicker/title/actions）+ 卡体（DataTable 等）+ 卡脚（Pagination） |
| `Reveal`/`RevealList` | 视口弹入原语（见下），`RevealList` 按 index 派生 stagger delay |
| `toolbar`/`card-grid`/`item-card`/`page-meta`/`form-panel` | 平台样式类，替代各模块重复实现的 `admin-grid/admin-card/toolbar` 等 |

迁移规则：通用布局样式只进平台；模块 `*.module.css` 只保留模块专属 selector（ops-*/policy-*/session-*/audit-*/permission-matrix 等）。新增页面优先用上述原语组装，不要复制近似布局。

### 滚动与动效运行时（`webui/src/scroll`、`webui/src/motion`）

- **阻尼平滑滚动**：`SmoothScrollController`（`webui/src/scroll/smooth-scroll.ts`）是 `lenis` 的项目自有窄契约封装（唯一第三方依赖，R067-002 结论）：`wrapper=.page-viewport`、`content=.page-flow`、`syncTouch=false` 保留触控原生惯性；reduced-motion 或派生配置关闭时销毁回退原生滚动。`ScrollExperience`（`webui/src/scroll/ScrollExperience.tsx`）在 AppShell 挂载 panel 模式、BlankLayout 挂载 window 模式。
- **页面滚动条插槽**：默认 `scrollbar-gutter: stable`（稳定插槽、预留右侧），避免 Windows 实体滚动条出现时挤压布局；派生配置 `scrollbar=overlay` 时切换 `scrollbar-gutter: auto`。
- **边缘阻尼/橡皮筋**：`EdgeBand` 在滚动容器边界越界时对 `.page-flow` 施加瞬态 `--edge-band-offset` 位移并弹性回弹；纯函数 `computeEdgeBand` 有单测。
- **磁吸吸附**：声明 `data-snap-x` 的横向滚动区（含 Shell 页签轨 `.workspace-tab-scroll`）启用 CSS `scroll-snap`。
- **显式滚动场景劫持**：声明 `data-scroll-hijack="x|y"` 的区域把纵向（横向）滚轮输入转换为容器内横向（纵向）滚动；`DataTable.wrapperProps` 可透传该属性（如能力清单/审计表）。`MutationObserver` 跟随路由内容变化重复应用。
- **弹入响应**：`Reveal`（`webui/src/motion/reveal.tsx`）用 IntersectionObserver + CSS transition 实现 spring 弹入，节奏档位 `calm/balanced/playful` 派生 `--reveal-duration/--reveal-ease/--reveal-offset`，`RevealList` 按 index 派生 `--reveal-delay` stagger；reduced-motion、`experience.reveal=false` 或缺省属性时元素直接可见。

### 派生配置设置（`ThemePreferences.experience`）

`theme.ts` 新增 `experience` 组：`smoothScroll`、`damping`（subtle/standard/relaxed）、`edgeDamping`、`magneticSnap`、`scrollHijack`、`reveal`、`revealRhythm`（calm/balanced/playful）、`scrollbar`（stable/overlay）；默认值为稳定插槽 + 平滑开 + standard + 边缘阻尼开 + 弹入开 + balanced。`applyTheme` 落到 `<html data-experience-*>`，旧 localStorage 主题自动迁移。ThemeDrawer 新增「体验」面板（host locale en-US/zh-CN）。`data-motion=reduce` 统一降级：销毁 Lenis、停用橡皮筋/劫持、Reveal 立即可见。

## 全量采用 HeroUI 组件库（068）

068 按用户指令把 WebUI 呈现层单轨替换为 HeroUI v3（+ Tailwind v4）：`@webui/sdk/ui` 导出契约与调用语义保持不变，内部改用 HeroUI 组件渲染；平台契约层（ActionTrigger 权限呈现、zone 注入、Reveal、滚动运行时、`experience` 派生配置、reduced-motion）不回归。059「不引入 Tailwind/组件库/动画库」由 068 取代（`docs/architecture/technology-selection.md` 已更新）。

### 依赖与主题

- 依赖：`@heroui/react@^3.2`、`@heroui/theme@^2.4`、`@heroui/toast@^2.0`、`@heroui/styles@^3.2`、`tailwindcss@^4`（`@tailwindcss/vite`）。
- 装配：`vite.config.ts` 挂 `tailwindcss()`；`webui/tailwind.config.js`（content 覆盖宿主 + 模块页面，`darkMode: "class"`，`heroui()` 插件）；`styles.css` 顶部 `@config` + `@import "tailwindcss"`；`main.tsx` 引入 `@heroui/styles/css`（HeroUI v3 的组件静态样式，`@heroui/react/styles.css` 只是占位转发）。
- 主题：`theme.ts` 的 `applyTheme` 在写 `data-color-scheme` 时同步切换 `<html>` 的 `dark` class（HeroUI 主题层）；preset 仍以既有 CSS 变量驱动，HeroUI 语义色映射列后续优化。

### 组件映射（`@webui/sdk/ui` 内部）

| SDK 导出 | HeroUI 底座 |
| --- | --- |
| Button / IconButton | Button（variant 映射、isIconOnly） |
| Field | TextField + Label + Input + Description + FieldError |
| SelectField | Select 复合（Label + Trigger/Value + ListBox） |
| StatusPill | Chip（success/warning/danger/default） |
| CapabilityBanner / InlineAlert | Alert 复合 |
| Skeleton / EmptyState | Skeleton / EmptyState |
| Toast | `@heroui/toast` 队列（App 根挂 `Toast.Provider`） |
| PageSection / StatCard / StatGrid / DataCard | Card 复合 + Tailwind（保留 `page-section/stat-card/data-card` 类钩子与 `data-reveal`） |
| DataTable | Table（RAC 底座；选择列、loading、empty、`wrapperProps` 滚动劫持语义保留） |
| Pagination | Pagination 复合（Root/Content/Item/Link/Previous/Next/Ellipsis） |
| ActionTrigger / BulkActionBar / FormSubmitActions | Button 底座 + 平台权限/防重复/禁用原因逻辑 |

### 保留自绘边界（如实记录）

- 遮罩容器（ConfirmDialog/Drawer/ThemeDrawer/RouteSearch 的 dialog 壳层）：HeroUI v3 Modal/Drawer 在 SSR 输出为空（运行时 portal 渲染），且既有 UI 层已满足 role=dialog/aria-modal/焦点/inert 语义，迁移将推翻大量 SSR 断言与 e2e；容器保持平台实现，内部控件已 HeroUI 化。
- Switch/Checkbox：HeroUI v3 复合组件不含交互 input（SSR 探针证实），RAC 底座的隐藏 input 与 Playwright label/role 解析冲突；回退自绘控件，待官方装配用法核定后迁移。

### 验证

质量门禁（typecheck/lint/vitest/build/generate:check/e2e/go build）与 067 一致；e2e 新增 `068 heroui adoption`（`.button--primary/.card/.select__trigger` 标记、dark class 联动、截图证据）；bundle 基线已记录（index ~1.06 MB raw / ~310 KB gzip）。

## 页面模板与布局规范（069）

所有业务页面的骨架按统一模板组装（HeroUI 控件 + Tailwind 布局；`page-section/stat-card/data-card` 等 class 仅作语义钩子）：

```
PageHeader（eyebrow/title/description/actions；标题用 HeroUI Typography.Heading）
→ StatGrid （KPI 行，tone 语义色：positive/attention）
→ PageSection（Card：kicker/title/description/actions + body + footer）
→ DataCard  （Card：卡头 + DataTable + Pagination footer）
→ Toolbar   （筛选/动作行）→ FormCard（PageSection + form-panel）
→ EmptyState / InlineAlert
```

- Shell 由 HeroUI/RAC 拼装：顶栏 `Header/Toolbar/Separator` 语义、搜索触发器与页签触发器用 HeroUI Button、账号菜单用 RAC `MenuTrigger+Popover+Menu`、遮罩（确认弹窗/抽屉/主题抽屉/路由搜索）用 RAC 受控 `Modal+Dialog`（portal 客户端挂载、关闭态不渲染）、开关/复选框用 RAC `Switch/Checkbox`（visual 对齐 HeroUI pill/box）。
- 布局 token（`--radius-*/--shadow-*`）引用 `--heroui-*` 变量；preset 语义色同步驱动 `--heroui-primary*` 与 `--primary`；暗色走 `<html>.dark`。
- 遮罩/菜单等 RAC overlay 组件 SSR 输出为空：单测统一走 `webui/src/test-utils.tsx` 的 `renderClient`（jsdom + createRoot + act），e2e 以 role/aria 断言为最终门禁。

## 菜单层级双向归属（070）

- **跨 owner 父引用**：`Navigation.ParentID` 可引用任意已声明 navigation（同模块或其他模块），不再要求同 owner；无环/顺序/图标/落地页可加载门禁复用；`settings.center` 收纳 `iam.security` 为第一实例（业务页面 → 设置组下级）。
- **宿主导航声明 HostNavigation**：composition 可为宿主声明导航项（owner=host，落地页可为任意已实现 route），宿主分组/平台页可被业务模块页面引用为父级；`host.center`（Management center）收纳 `settings.center` 构成「宿主框架组织业务」的完整双向链。
- 路由与页面归属不变（落地页 RouteID 必须属于声明者）；菜单树仍由 manifest 投影 + 宿主递归渲染（零改动）。
- 设置中心（模块 settings）：Profile/Account/Appearance/Notifications 四页 + `settings.center` 菜单；Appearance/Notifications 为前端偏好（localStorage），Account/Profile 复用 IAM 能力（跨模块 HTTP 先例）；通知偏好明确无后端服务。

## 菜单层级多形态：全局菜单树与页内侧边栏（071）

- 菜单分类层级支持两类形态并存：
  - **全局菜单树**：主导航层级由 manifest `menu`（模块 Navigation + 宿主导航 HostNavigation）驱动，侧栏递归渲染；适合分区各自需要全局可达/移动端折叠的场景（如 070 设置中心四子页入树）。
  - **页内侧边栏**：由 SDK `SectionNav` 原语提供（`@webui/sdk/ui`）：多分区页面在内容区左侧（≤720px 转横向分区条）提供垂直分区导航，`aria-current="page"` 高亮、键盘上下/Home/End、href 深链；适合「分区属于同一入口、用户在同一工作流内切换」的场景（如设置中心四分区）。
- 两形态可组合：`settings` 模块既保留全局菜单树（host.center→settings.center→四子页），又在每个分区页面内提供 `SectionNav`（`SettingsNavLayout`），展示两类层级的并存示范。
- 新增多分区业务页面时优先考虑页内形态复用 `SectionNav`（账号中心/运营中心等）。

## 设置中心 8 分区与 SPA 导航（072）

- 设置模块细化为 8 分区：profile（主页资料：昵称/介绍/出生日期）、account（用户名与软注销）、security（密码/认证）、appearance、notifications、language、about、acknowledgement；页内 SectionNav 全列，全局菜单 `settings.center` 子项五主分区。
- SPA 导航：模块页面经 `@webui/sdk/runtime` 的 `HostRuntime.navigate(path)`（宿主注入 react-router）做页内分区切换，**不再整页刷新**；`SettingsNavLayout` 以 SectionNav onSelect 驱动（071 的 href 默认导航路径已单轨移除）。
- IAM 自服务资料/软注销：`PATCH /api/v1/iam/self/profile`（乐观锁，不撤销会话）、`POST /api/v1/iam/self/archive` 与 `/confirm`（两步确认，TTL 进程内存储；复用归档语义：登录阻塞、会话吊销、不物理删除）；account 页注销流程两步确认。
- 语言偏好：`language` 分区写宿主语言键（`community-go-webui-language`）并重载；about/acknowledgement 为 i18n 静态双语页。

## 全局菜单两级与分组布局（073）

- **全局菜单两级**：当前应用顶级为「设置」（settings.center，落地 /settings/profile）→ 五主分区子项；不再存在「管理中心」宿主分组层（HostNavigation 契约能力保留在 `internal/webui`，composition 不再装配，供未来宿主分组使用）。
- **分组布局（固定页内导航）**：`Binding.Route.GroupLayoutID` 引用本模块布局 entry（validate 校验归属）；宿主 App 对同组路由用 `ModuleGroupLayout` 承载（懒加载布局、`<Outlet/>` 作为 children 注入，布局组件无 react-router 依赖）；设置中心八个 /settings/* 路由共享 `SettingsLayout`（固定 SectionNav + 内容区），切换分区时页内导航不卸载重挂（e2e 以 dataset 标记断言）。
- 承接 071 的页内导航语义由布局单实例承担（原各页面内嵌 SettingsNavLayout 已退役）。

## 多分区页面通用范式与菜单一致性（074）

- **通用范式（不专属任一业务）**：多分区页面 = 全局菜单一组（manifest 驱动）+ 页内分组布局（`Route.GroupLayoutID` + SDK `SectionNav`）；全局子项与页内分区**同名同序**（同一语义，不得错位）。settings（8 分区）是该范式的一个实例；任何业务模块都可复用。
- **页面职责边界**：WebUI 功能模块**自己实现页面**；需要他模块（如 iam）能力时**调用其接口**实现（settings 调 `self/profile`、`self/archive`、`self/password`），不把他人页面挂进自己的菜单/页内导航。
- 全局「设置」两项级是否展开由菜单声明决定；跨 owner `ParentID` 与 `HostNavigation` 仍是平台能力（供未来宿主分组），当前应用不再把 iam 页面挂入设置组。

## OpenAPI 可测试 API 工作台（075）

- **模块形态**：`openapi` 是 WebUI-only 模块（settings 同形态，无 module.go 业务层）：`/openapi` 单路由 + `openapi.docs` 顶级菜单项（无 ViewOperationID，契约是公开仓库产物）。
- **工作台视图（R075-004）**：静态路由契约不支持动态路径，动态详情以模块内视图状态实现——`OpenAPIPage` 为工作台（左栏可搜索操作树 + 主区），`OperationDetail` 承载可编辑参数/JSON 请求体/执行面板，`SchemasView` 浏览模型；`?view=&op=` search 参数深链（`history.replaceState` + `popstate` 恢复）；全部组件来自 `@webui/sdk/ui`，HTTP 方法徽标等无语义平台细节由模块内小组件 + css module 承担。
- **执行语义**：模块内自建执行器（`openapi-data.ts` 的纯函数 `buildRequest` + `OperationDetail` 的同源 `fetch`）：`bearerAuth` 注入内存 token（不持久化）；`webuiSession` 自动携带会话 Cookie，mutation 自动附加 `Origin`+`X-CSRF-Token`（复用 `/api/v1/iam/session` 快照）；mock 声明（`readWebUIDataSource() === "mock"`）执行禁用并提示；响应面板呈现状态/耗时/头/格式化 JSON body，错误如实展示。
- **契约数据源（单权威）**：`go run ./cmd/app webui generate` 从 `api/openapi.yaml` 渲染 `webui/src/generated/openapi-spec.ts`（JSON 对象 + sha256），路径由 `.scaffold/layout.json` 的 `webui.specOutput` 声明；`--check` 整文件严格比对；页面直接 import，mock 下浏览零请求、`mock.ts` 空路由表。
- **DataTable 平台修复**：`@webui/sdk/ui` 的 `DataTable` 将首个可视列标为 RAC Table 的 `isRowHeader`（客户端渲染必需），并新增客户端渲染回归测试。
- **安全边界如实呈现**：执行是用户主动行为、权限即当前 WebUI 会话；token 仅内存；mock 无后端时仅浏览。

## 强制 i18n 契约

WebUI i18n 是所有接入模块必须遵守的规范契约。模块只要贡献页面、菜单或状态，就必须在自身 WebUI Binding 中声明 locale namespace 和资源文件；没有 locale Binding 的模块不得进入生产 registry。locale namespace 的 owner 始终是业务模块，宿主只负责聚合、加载、语言选择、fallback 和缺失资源状态。

模块页面只能通过 `@webui/sdk/i18n` 的 `useWebUITranslation(namespace)` 取得文案，不得自行初始化 i18next、直接操作宿主 singleton、直接依赖 `react-i18next` 内部实例，或在生产 Web 源码中写入用户可见硬编码文本。标签、按钮、字段、帮助、状态、诊断、校验、空态、错误和反馈都属于必须翻译的用户文案；技术 ID、CSS class、协议字段和测试断言不属于用户文案。

宿主启动阶段只装载 `webui.host` locale。运行时 manifest 先校验 `catalogRevision` 与 generated registry，再把 `navigationRevision` 纳入 route query 失效边界；两者不能互相替代。菜单由静态 Catalog、数据库 NavigationPolicy snapshot、access 和 availability 共同投影，策略只能改变已注册 NavigationID 的 enabled、parent 与 order，Route/Entry/组件路径/ViewOperationID/owner 始终来自代码。每次 Manifest 请求都读取并校验一个当前策略快照；首版不使用 cache、watcher 或后台 goroutine。策略页面保存后只能通过宿主 SDK 的 `refreshManifest` 刷新，不能直接修改宿主菜单状态。随后按 eligible route/navigation 懒加载模块 namespace；`availability` 缺失、未知或不支持 degraded capability 时按 unavailable 处理。

### 菜单层级分类（063）

webui 契约 `Navigation.ParentID` 原生支持多级菜单，宿主 `SidebarMenu` 按 `manifest.menu.parentId` 递归渲染。当前应用对业务模块已做层级分类（063）：`iam.access`（身份与权限管理，落地页 `iam.accounts`）为 IAM 顶级组父节点，`iam.security/accounts/roles/permissions` 为其子项；`organization.directory`（组织管理，落地页 `organization.departments`）为 Organization 顶级组父节点，`organization.departments/positions/assignments` 为其子项；`ops.dashboard` 保持两级（工作台 → 能力清单）；`navigation.menus` 保持平铺。规则：

- 分类父节点必须引用同模块已实现路由作为落地页（不新建页面），并满足 `validateBindings` 的同模块 ParentID、无环、图标目录与 Order 约束；父节点顺序必须在子项之前。
- 父节点落地页不可加载（access 拒绝或 availability 不可用）时，Manifest 会连带隐藏整棵子树（既有门禁语义）。新增分类父节点时应选择同组内普遍可访问的已实现路由作为落地页。
- 新增分类父节点必须同步三处：模块 locale（组标题 en-US/zh-CN，满足强制 i18n）、`internal/module/navigation/binding/webui/web/mock.ts`（菜单管理页 mock 数据）、重新生成 `webui/src/generated/webui-registry.ts`（mock manifest `menu` 树）；`pnpm generate:check` 守护一致性。

后端错误码只能映射到稳定的 message ID，不能直接映射到中文/英文展示文本。正确形态是：

```ts
const setupErrorMessageIDs: Record<string, string> = {
  invalid_request: "webui.iam.errors.invalidRequest",
};
```

页面再调用翻译契约渲染该 ID。`setupErrorMessages` 这类直接返回“当前 WebUI 地址未被后端允许……”等展示文本的实现违反规范，必须改为 error code -> message ID -> 当前语言文案的链路。Host 自有文案也应进入 host-owned locale resource，不得用宿主 i18n adapter 内联字符串绕过规范。

宿主 Shell、主题抽屉、全局搜索等公共交互同样必须订阅 `useWebUITranslation("webui.host")`。`translateMessage` 只适合作为按 message ID 查找的辅助函数，不能替代 React 组件对语言变化的订阅；语言切换后 Header、页签、状态层和 overlay 必须在同一 i18n instance 的事件驱动下同步刷新。

每次新增或修改模块页面，必须验证：

1. Binding、locale registry 和资源文件完整且 namespace/language 唯一；
2. 页面源码只使用公开翻译契约，用户可见文本没有硬编码；
3. error code 映射只产生 message ID，缺失 key/namespace/language 时 fail closed 或展示低敏诊断；
4. architecture、module lint 与 i18n 扫描已实际枚举本次模块；动态发现不会替代新增模块的反向违规证据；
5. `pnpm generate:check`、`pnpm typecheck`、`pnpm test`、`pnpm lint` 和 `pnpm lint:modules` 均通过；其中 `pnpm lint` 已包含 i18n 与 architecture，但不包含 `lint:modules`、typecheck、test、build、E2E 或 generate check；
6. `pnpm e2e -- --workers=1` 覆盖真实状态门禁。至少检查 setup/login/logout/session、denied/unavailable/degraded 与 management 请求数量；Auth/Ops 桌面、移动和主题截图在 Playwright `test-results/` 中人工复核。未启动浏览器测试或未查看截图时必须明确标为未验证。
