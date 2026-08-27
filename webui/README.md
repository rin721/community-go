# Admin WebUI

`webui/` 是当前根 Go 工程质量链已接入的 React/Vite Admin WebUI。仓库构建布局由根 `.scaffold/layout.json` 声明：模块 WebUI facet、宿主源码、registry 输出和生成物路径都从该清单读取；Binding 中的 `SourcePath` 只写所属 facet 内的相对路径。

## 本地开发

从仓库根目录先启动后端并提供 setup token，再在第二个终端执行：

```powershell
corepack enable
corepack install --global pnpm@10.22.0
Set-Location webui
pnpm install
pnpm generate:check
pnpm dev
```

默认地址为 `https://127.0.0.1:5173`。需要调整开发端口或代理时，复制 `webui/.env.example` 为 `.env.local`，使用 `WEBUI_DEV_HOST`、`WEBUI_DEV_PORT`、`WEBUI_API_TARGET` 和 `WEBUI_MANAGEMENT_TARGET`；Vite 与 Playwright 共用这组受控配置。IAM 已提供 setup/login/security/users/roles/permissions 页面与持久化，完整步骤见[WebUI 本地启动指南](../docs/getting-started/webui.md)。

## 静态质量

根目录统一入口：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/Verify-WebUI.ps1
```

Linux 使用 `bash scripts/verify-webui.sh`。质量链覆盖生成检查、冻结安装、lint、模块 lint、typecheck、test 和 build；它不启动后端，不替代 Playwright E2E、视觉验收或生产部署验证。

## 边界

- 业务 WebUI 页面由对应 `internal/module/<id>` 持有；宿主 SDK 和跨模块资源规则由 WebUI 开发文档与 lint 约束。
- WebUI 已证明本地 Vite 开发、静态构建与 Go 服务托管（模式 B）：Docker 镜像构建期装配 `webui/dist`，release 归档包含 `webui/dist`；托管目录、托管前构建脚本与模式切换由 `config.yaml` 的 `webui.hosting` 声明。容器 runtime 与远端 CI 的浏览器/容器验收仍在独立验证边界。
- 新增页面、模块、路由、生成契约或运行方式时，必须更新对应 authority 并提交 `documentation-impact.yaml`。

## 宿主骨架与体验（059）

- `webui/src/styles.css` 是平台样式唯一 authority：分区组织（token/reset/Shell/overlay/public UI/loading/responsive/reduced-motion），
  layout/z-index/motion 由语义 token 提供（`--shell-*`、`--z-*`、`--motion-*`），业务 selector 禁止进入该文件；模块 CSS 不得用平台级或裸 `:global` 绕过 scope。
- 宿主组件按 `webui/src/components/shell/*` 拆分（Sidebar/Header/AccountMenu/SidebarMenu/ShellSkeleton），
  083 已移除宿主 Tab Bar、visited-tabs 状态和固定 Footer；AppShell 保留现有公开 props，模块只消费 `@webui/sdk/*`。
- loading 使用 Shell/Page/Data skeleton 单轨；reduced-motion 同时尊重显式偏好与系统 `prefers-reduced-motion`。
- 新增平台样式、动效时长或 shell 交互时，同步更新 `webui/src/motion.ts` 与 `webui/src/theme.ts` 并补测试。

## Production-grade 页面骨架（083）

- Shell 使用 `100dvh`；Sidebar 独立滚动，主工作区将页面滚动收敛到 `.page-viewport`/`.page-flow`，不再依赖固定 Tab Bar 或 Footer。移动视口需用真实设备或移动仿真补验。
- 页面根节点用 `data-page-width` 选择 `wide/detail/settings/form`，对应 `--content-max-wide`（1600px）、`--content-max-detail`（1200px）、`--content-max-settings`（960px）、`--content-max-form`（760px）；宽度 token 只在 `styles.css` 维护。
- 列表页的 FilterBar、分页和排序由 URL query 驱动；危险 mutation 必须经过确认流程；空态使用 `EmptyState`，业务状态使用 `StatusBadge`，能力状态使用复用 `StatusBadge` 语义映射的 `StatusPill`。
- 平台 `MetricCard`、`EntityHeader` 等公共原语从 `webui/src/ui` 导出，模块通过 SDK/公共 UI 契约消费，不复制近似卡片和详情头。

## 骨架分区注入点与交互规范（062）

- 分区注入点（zone）是骨架各区域的类型化扩展：`header-actions`（顶栏）/ `sidebar-panels`（侧边栏）/ `page-header`（页头）/ `workspace-tabs`（页签栏）/ `footer-status`（底部）；
  Binding 声明 → 生成 `webuiZoneRegistry`（`webui/src/generated/webui-registry.ts`）→ Manifest `zones`/`actionPermissions` 投影 → 宿主 `webui/src/zone/*` 懒加载渲染。
- SDK capability `zone`（major 1）：`@webui/sdk/zone` 提供 `useZoneContributions`、`useActionAccess`、`ZoneSlot`；模块 zone 组件只接收 `{ contribution, navigate }`。
- 交互状态链原语：`ActionTrigger`（pending/防重复/禁用原因/权限呈现）、`BulkActionBar`、`FormSubmitActions`；图标目录 authority 在 `webui/src/icon-catalog.ts`（Go `internal/webui/icons.go` 校验，测试守护一致）。
- 完整契约与接入步骤见 [WebUI 开发指南](../docs/development/webui.md)。

## OpenAPI：API 文档与在线调试（075/009）

- 新业务模块 `openapi` 提供「API 文档」模块（`/openapi` 顶级菜单项）：**Apifox 核心骨架、系统组件呈现（R075-009）**——单路由工作台：左资源树（`ApiTree`：Disclosure 递归接口树 + 搜索 + 折叠）→ 顶部多标签（`WorkspaceTabs`：HeroUI Tabs 受控、关闭/横滑/激活高亮）→ 主工作台上下分割（`RequestPane`：URL+发送 + Params/Body/Headers/Cookies/Auth 动态表单；`Resizer` 模块内可拖动分割线；`ResponsePane`：状态/耗时/大小/高亮 JSON）。
- **业务能力（提取自 Apifox，不用其外壳）**：文档查看（说明、参数表、请求体与返回示例 JSON 高亮、响应表）；在线调试 Try it out（参数 Field 行、Body：JSON Textarea 样例+校验 / form-data 含文件上传 / urlencoded、Headers、Cookies、Auth、发送 Button）→ 响应卡片（状态 Chip、耗时、大小、JSON 高亮/原始、响应头折叠）。
- **可测试执行语义**：同源 `fetch`（credentials include）——bearerAuth 注入内存 token（不持久化）；webuiSession 自动携带会话 Cookie，CSRF 绑定写操作自动附加 `Origin`+`X-CSRF-Token`；错误如实呈现（Problem JSON 优先）；mock 演示构建执行禁用并提示。深链 `?op=&mode=`；Cmd/Ctrl+K 快速跳转（平台 Modal）。
- 契约数据源：`webui generate` 生成 `webui/src/generated/openapi-spec.ts`（`api/openapi.yaml` 的 JSON 变换，含 sha256），页面直接 import，三态环境一致、mock 浏览零请求；控件基座为 HeroUI（经 `@webui/sdk/ui` 透传）；JSON 高亮 `highlight.js`（仅 json 语言）；布局清单新增 `webui.specOutput`；受控图标目录新增 `book`；平台 DataTable 修复延续。访问门槛绑定 `iam.session.read`（未登录跳 /login，mock 恒 allowed）。

## 侧边栏菜单层级分类（063）

- 宿主 `SidebarMenu` 按 `manifest.menu.parentId` 递归渲染多级菜单；菜单树形状完全由 Go 侧各模块 `binding/webui/binding.go` 的 `Navigation` 声明（`ParentID`/`Order`/落地页 `RouteID`）决定，宿主无菜单树硬编码。
- 当前应用已分类：`iam.access`（身份与权限管理）与 `organization.directory`（组织管理）为顶级组父节点，各自模块页面归入其下；`ops.dashboard` 两级、`navigation.menus` 平铺。
- 新增分类父节点时同步：模块 locale 组标题、`internal/module/navigation/binding/webui/web/mock.ts` 菜单行、重新生成 `webui/src/generated/webui-registry.ts`（mock manifest `menu` 树），并跑 `pnpm generate:check`。

## 账号与权限体系进阶页面（064）

- Auth 审计日志页（`/admin/audit`）：只读展示低敏授权决策与业务写操作审计（subject/resource 仅摘要、支持 action/resourceType/outcome 筛选），`auth:audit:read` 权限键投影访问状态；持久化 Sink 由 Auth 模块内部装配。
- IAM 会话管理页（`/admin/sessions`，归入「身份与权限管理」组）：列表只显示 SessionID 摘要（hex）与过期信息，支持批量吊销，沿用安全修订与 owner 不变量；`iam:session:read/revoke` 权限键投影。
- 065：IAM/Organization/Navigation 业务写操作经窄 port 注入同一低敏审计面，审计页可查询「谁改了什么」；两页均遵循模块接入四步（Binding/locale/mock/CSS + 生成链），宿主源码零改动。

## 管理页按钮级权限与交互闭环（066）

- IAM 用户/角色页、Organization 部门/岗位/分配页与 Navigation 菜单页的写操作按钮（创建/启停/重置/改名/归档/保存策略）均经模块 Binding `ActionPermissions` + SDK `ActionTrigger` 接入动作级权限投影：denied 时按钮隐藏或禁用，未声明/未投影的 operation 前端不做呈现限制（服务端授权继续 fail closed）。
- 账号/角色列表支持关键字过滤与分页；角色权限与账号角色保存遇到 409 时展示 added/removed 差异并重新加载最新版本（不静默丢弃未保存选择）；Organization 分配使用 `expectedVersion` 乐观锁并在冲突时重载。

## 业务 mutation 请求身份（076）

- 全部业务模块（IAM/Organization/Navigation）的写操作均要求 `webuiSession` 认证：mutation 请求必须携带 `Origin`（同源）与 `X-CSRF-Token`（来自当前 Session），缺失或失效由服务端 403 `csrf_invalid` 拒绝。模块前端统一使用「加载 Session 时 remember csrfToken → mutation headers」模式（先例 `internal/module/iam/binding/webui/web/api.ts`，076 起 Organization 页面对齐）。

## 图表原语与运行监控（081）

- `webui/src/ui` 新增**自研 SVG 图表原语** `Sparkline`/`LineChart`（零第三方依赖、多系列/空数据态/aria-label、Vitest 覆盖），任何模块可复用；复杂交互图表（缩放/联动）出现时再评估引入图表库。
- Ops Dashboard 新增「监控」分区（1Panel 式仪表盘，R081-003 人因返工）：健康横幅（全部正常/N 项降级/N 项故障）+ 大数值指标卡行（CPU（进程 %，进度条+趋势）、内存（分配量+占比条+趋势）、磁盘/网络（未接入态+node-exporter 指引））+ 组件状态表（状态圆点+语义词+异常高亮）+ 带坐标轴实时趋势图（y 刻度/x 时间标签/图例，`AxisLineChart`）+ 最近采样 N 秒前；前端滚动窗口约 5s×60 点轮询累积，重启即空。仅在 available 状态下挂载（degraded 路由保持既有能力边界）。OS 级指标由宿主机 Prometheus node-exporter 补齐（运维文档指引）。

## WebUI 产品架构与 UI 体系重构（082）

- **平台语义组件**（`webui/src/ui` + `@webui/sdk/ui` 导出：保持既有契约扩展）：`DataTable` 增强（列显隐/行密度/Sticky/行操作菜单，`enhancements` 可选）、`FilterBar`/`SearchInput`（统一列表工具栏）、`FormField`/`Field` 宽度档（Label/Description/Control/Helper/Error）、`StatusBadge`（语义状态集）、`CodeText`/`CodeViewer`（monospace 技术标识符与 JSON 展示）、`DangerZone`（危险操作流程）、`ErrorState`（分级）、`TreeView`/`InspectorPanel`（树 + 详情）、`DetailDrawer`（规格化 Master–Detail）、`Skeleton` 分级；design tokens 补 `font.*`/`control.*`/`info`/`success`/宽度档（`--content-max-*`）。
- **Query 契约**（`@webui/sdk/query`）：`useWebUIQuery`/`useWebUIMutation`（缓存/失效/取消/ProblemError）+ `useListQueryParams`（列表过滤/分页/排序 URL 化）；`useGatedQueries`（Ops 门禁）保持。
- **页面迁移**：IAM `AccountsPage`（DataTable 目录 + Create Drawer + User Detail Drawer）、`RolesPage`（DataTable + 权限矩阵详情）、`PermissionsPage`（分组 Catalog + Used by Roles）、`SessionsPage`（DataTable + 批量吊销）、`ApiTokensPage`（Scope 按模块分组 + 可复制密钥）；Auth `AuditPage`（Log Explorer + Detail Drawer，仅低敏摘要字段）；Ops `DashboardPage`（顶栏 Context 行：版本/提交/运行时长/数据源，真实数据）；Organization `DepartmentsPage`（部门树 + Inspector）；Navigation `MenusPage`（导航树 + 策略 Inspector）。
- 细节见 [082 变更记录](../docs/changes/082-webui-architecture-rebuild/README.md)。

## 安全页：MFA 与 API 令牌（078/080）

- 设置中心「安全」页（`settings/.../SecurityPage.tsx`）新增 **MFA/TOTP 区块**（绑定显示 otpauth URI、确认激活展示一次性恢复码、禁用需验证码/恢复码复核）；080 起 API 令牌区块降级为**入口与摘要**（数量/最近使用 + 跳转）。
- **API 令牌独立管理页（080）**：IAM 模块新增 `/admin/api-tokens`（列表+status 过滤+状态 Pill、创建向导=当前账号可授予权限勾选、明文一次弹窗、禁用/启用/轮换/吊销、过期展示）；遵循「复杂功能可作入口、不作实操页」原则。

## 设置中心 8 分区与 SPA 导航（072）

- 设置套件细化为 8 分区：Profile（主页资料表单，IAM 自服务 updateProfile 乐观锁）、Account（用户名 + 两步软注销，`self/archive` 复用归档语义）、Security（改密）、Appearance、Notifications、Language（写宿主语言键并重载）、About、Acknowledgement；页内 SectionNav 全列、全局菜单五项。
- 模块 SPA 导航：`HostRuntime.navigate`（宿主注入 react-router）驱动页内分区切换——不再整页刷新（071 取舍已修复，单轨）。
- 验证见 `webui/test-results/072-settings-*.png` 与 [072 变更记录](../docs/changes/072-settings-suite-refine/README.md)。

## 页内侧边栏形态与菜单多层级（071）

- 平台新增 `SectionNav`（`@webui/sdk/ui`）页内分区导航原语：navlist 语义、`aria-current="page"` 高亮、键盘上下/Home/End、href 深链；≤720px 自动横向折叠。
- 设置中心四分区接入 `SettingsNavLayout`（页内侧边栏 + 内容区），与全局菜单树并存——菜单分类层级支持「全局菜单树 / 页内侧边栏」两形态（规范见 [WebUI 开发指南](../docs/development/webui.md)）。
- e2e 与截图见 `webui/test-results/071-settings-*.png` 与 [071 变更记录](../docs/changes/071-settings-in-page-navigation/README.md)。

## 设置中心与菜单双向归属（070）

- 新业务模块 `settings`：Profile/Account/Appearance/Notifications 四页 + `settings.center` 两级菜单（i18n/mock/受控图标/生成链）。
- 菜单契约升级：`Navigation.ParentID` 跨 owner 引用（任意模块/宿主导航项可互为上下级）+ 宿主导航声明 `HostNavigation`（owner=host，如 `host.center` 收纳设置中心组）；`iam.security` 挂入设置组作双向实例。
- 验证与截图见 `webui/test-results/070-settings-*.png` 与 [070 变更记录](../docs/changes/070-settings-center-and-menu-hierarchy/README.md)。

## 骨架 HeroUI/RAC 拼装与布局重构（069）

- Shell 与遮罩/表单控件由 HeroUI/RAC 拼装：布局 token（`--radius-*/--shadow-*`）引用 `--heroui-*` 变量，preset 语义色同步驱动 `--heroui-primary*`；搜索/页签触发器用 HeroUI Button，账号菜单用 RAC `MenuTrigger+Popover+Menu`，确认弹窗/抽屉/主题抽屉/路由搜索用 RAC 受控 `Modal+Dialog`（portal 客户端挂载、关闭态不渲染），开关/复选框用 RAC `Switch/Checkbox`（视觉对齐 HeroUI pill/box）。
- 页面模板规范（PageHeader→StatGrid→PageSection→DataCard→Toolbar→FormCard→EmptyState/InlineAlert）与 RAC overlay 测试客户端化（`renderClient`）见 [069 变更记录](../docs/changes/069-heroui-skeleton-rebuild/README.md) 与 [WebUI 开发指南](../docs/development/webui.md)。

## 全量采用 HeroUI 组件库（068）

- 呈现层单轨替换为 HeroUI v3 + Tailwind v4：`@webui/sdk/ui` 导出契约不变，Button/Field/SelectField/StatusPill/CapabilityBanner/InlineAlert/Skeleton/EmptyState/Toast（`@heroui/toast` 队列）/PageSection/StatCard/StatGrid/DataCard/DataTable（RAC Table）/Pagination（复合）/ActionTrigger/IconButton 内部改用 HeroUI；平台契约层（ActionTrigger 权限呈现、zone、Reveal、滚动运行时、`experience` 配置、reduced-motion）不回归。
- 依赖与装配：`@heroui/react/@heroui/theme/@heroui/toast/@heroui/styles` + `tailwindcss@^4`（`@tailwindcss/vite`）；`tailwind.config.js`（darkMode=class、heroui() 插件）；`main.tsx` 引入 `@heroui/styles/css` 组件静态样式；`applyTheme` 联动 `<html>`.dark。
- 保留边界（如实记录）：遮罩容器（ConfirmDialog/Drawer/ThemeDrawer/RouteSearch）与 Switch/Checkbox 自绘；组件样式、e2e 语义与截图证据见 [068 变更记录](../docs/changes/068-heroui-ui-adoption/README.md)。

## 页面布局骨架与滚动/动效体验（067）

- 平台布局骨架原语（`@webui/sdk/ui`）：`PageSection` 区块卡片、`StatGrid`/`StatCard` KPI 统计行、`DataCard` 数据表格卡片、`Reveal`/`RevealList` 弹入响应；通用布局样式（`toolbar`/`card-grid`/`item-card`/`page-meta`/`form-panel`）收编进 `styles.css` public UI 分区，全部业务模块页面已迁移（IAM/Organization/Auth/Navigation/Ops），模块 CSS 只保留专属 selector。
- 滚动体验运行时（`webui/src/scroll/*`）：`SmoothScrollController` 以项目窄契约封装 `lenis`（唯一新增第三方，R067-002 结论）实现阻尼平滑滚动（`wrapper=.page-viewport`、`content=.page-flow`、触控原生惯性）；`EdgeBand` 边缘阻尼/橡皮筋；`data-snap-x` 磁吸吸附；`data-scroll-hijack="x|y"` 显式滚动场景劫持。页面滚动条默认 `scrollbar-gutter: stable`（稳定插槽、预留右侧）。
- 派生配置设置：`ThemePreferences.experience`（smoothScroll/damping/edgeDamping/magneticSnap/scrollHijack/reveal/revealRhythm/scrollbar），落到 `<html data-experience-*>` 并由 ThemeDrawer「体验」面板调整；旧主题自动迁移；`data-motion=reduce` 统一降级（销毁 Lenis、停用橡皮筋/劫持、Reveal 立即可见）。
- 组织模块修复：分配页 `assignments.saved/conflict/revision` 翻译键补全（阻塞「翻译资源缺失」占位）、部门/岗位/分配操作失败反馈与 locale 键一致性用例。
