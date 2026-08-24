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
  layout/z-index/motion 由语义 token 提供（`--shell-*`、`--z-*`、`--motion-*`），业务 selector 禁止进入该文件。
- 宿主组件按 `webui/src/components/shell/*` 拆分（Sidebar/Header/WorkspaceTabs/AccountMenu/SidebarMenu/ShellSkeleton），
  AppShell 保留现有公开 props 并在本文件 re-export 纯函数，模块只消费 `@webui/sdk/*`。
- loading 使用 Shell/Page/Data skeleton 单轨；reduced-motion 同时尊重显式偏好与系统 `prefers-reduced-motion`。
- 新增平台样式、动效时长或 shell 交互时，同步更新 `webui/src/motion.ts` 与 `webui/src/theme.ts` 并补测试。

## 骨架分区注入点与交互规范（062）

- 分区注入点（zone）是骨架各区域的类型化扩展：`header-actions`（顶栏）/ `sidebar-panels`（侧边栏）/ `page-header`（页头）/ `workspace-tabs`（页签栏）/ `footer-status`（底部）；
  Binding 声明 → 生成 `webuiZoneRegistry`（`webui/src/generated/webui-registry.ts`）→ Manifest `zones`/`actionPermissions` 投影 → 宿主 `webui/src/zone/*` 懒加载渲染。
- SDK capability `zone`（major 1）：`@webui/sdk/zone` 提供 `useZoneContributions`、`useActionAccess`、`ZoneSlot`；模块 zone 组件只接收 `{ contribution, navigate }`。
- 交互状态链原语：`ActionTrigger`（pending/防重复/禁用原因/权限呈现）、`BulkActionBar`、`FormSubmitActions`；图标目录 authority 在 `webui/src/icon-catalog.ts`（Go `internal/webui/icons.go` 校验，测试守护一致）。
- 完整契约与接入步骤见 [WebUI 开发指南](../docs/development/webui.md)。

## OpenAPI 契约可视化页面（075）

- 新业务模块 `openapi` 提供「API 文档」页（`/openapi`，顶级菜单项）：页面壳层与其余页面使用同一套 `@webui/sdk/ui` 组件（PageHeader/PageSection/InlineAlert），交互文档区由第三方 `swagger-ui-react`（官方 Swagger UI React 封装，固定版本 5.32.14，R075-001）在模块内窄封装渲染。
- 契约数据源：`webui generate` 同时生成 `webui/src/generated/openapi-spec.ts`（`api/openapi.yaml` 的 JSON 变换，含源文件 sha256），页面直接 import——`server-hosted`/`separated`/`mock` 三态零请求一致渲染；`--check` 严格比对防漂移；模块 `mock.ts` 为空路由表（页面零请求）。
- 布局清单新增 `webui.specOutput`（默认 `webui/src/generated/openapi-spec.ts`），生成链与 `webui-registry.ts` 同命令同门禁；受控图标目录新增 `book`。
- 与本页相关的安全边界如实呈现：`bearerAuth` 操作可用 Authorize 注入 token；`webuiSession`/CSRF 绑定写操作无法从参考页执行；mock 演示构建无后端、请求类交互不可用。

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
