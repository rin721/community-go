# Admin Surface 实现约束

本目录是 `@community-go/admin-surface`（private workspace）：只承载 Admin Surface 的
Plugin 业务、shell 模型、Group Alias / icon vocabulary 与 generated 产物，为
dependency ownership、module resolution、typecheck 与 test 服务。

- 具体 Plugin 不是 Package，也不是 Surface 公共 API。对 Host 只开放
  `./shell`、`./icon-presentation`、`./icon-components`、`./generated/composition`、
  `./generated/catalog`、`./generated/routes/*`；
  禁止把 `plugins/*` 加入 exports，禁止通过相对路径绕开 generated bridge 导入 Plugin internals。
- Route Catalog、业务 Route IDs 与 module bridges 全部位于 `generated/`；
  产物带 `// @generated` 头，**禁止手改**——修改后运行 `pnpm codegen:admin` 重新生成，
  并用 `pnpm codegen:admin:check` 复核 freshness。
- Plugin Page 只消费 `@community-go/admin-framework/plugin` 的稳定契约
  （`route`/`AdminRouteLink`/`useAdminNavigation`/`useAdminLocale`/稳定 props）；
  禁止 import `next/*`、`generateStaticParams`、`generateMetadata`、Next route config、
  Browser history、全局 location、**lucide-react**（图标经 surface icon API 消费语义 id）。
- 每个 `page.tsx` 必须与同目录 `route.meta.ts` 一一对应；`route.meta.ts` 不再声明
  `navigation`（Sidebar 贡献迁移到 `plugin.navigation.ts`），只保留 titleKey /
  permissions / canonicalParentOverride / activeNavigationOverride；override 必须同
  Plugin 并附 rationale。
- 允许依赖 Universal、`admin-foundation`、`admin-framework`、`form-foundation`、
  `schemas` 与 Surface 基础设施（lucide-react 仅限 surface src 基础设施，不进 Plugin）；
  禁止依赖 `apps/*`、Browser/Desktop API、后端 DTO、请求、Session 或权限实现。
- 新建 File Route / Navigation Contribution 前先读
  [Admin Framework 与 Surface File Routes](../../docs/admin-framework.md)。
- Sidebar Navigation Contribution（`plugin.navigation.ts`）：
  - 模型固定 Group → Parent → Child；`groupId` **选择** plugins 公共 Group Alias
    （`plugins/navigation-groups.ts` 的 `system` / `reference` / `development` 等），
    **不定义** Group；新增 Group Alias 属 plugins 范围公共 IA Contract 变更
    （改 navigation-groups.ts + surface i18n labelKey），不是单个 Plugin 私有声明。
  - `navigationId` 必须 `${pluginId}.` namespace；层级用内嵌 `children`（无
    parentNavigationId / 跨 Plugin parent）；Child 必须带 `routeId` 且静态可解析；
    Parent 无 routeId 为纯 Disclosure（点击只展开/收起），无 routeId 且无 children
    报 orphan。未知 Alias 由 codegen gate 报 `UNKNOWN_ADMIN_NAVIGATION_GROUP` 硬失败，
    禁止 silent drop。
- `navigation.iconId`（可选）是 Plugin Navigation Contribution 的 semantic
  presentation metadata（不是 Plugin capability / 能力协商），必须命中 Admin
  Surface icon vocabulary（唯一 authority：`surfaces/admin/src/navigation-icon.ts`，
  受控、不动态化）；未知 iconId 由 codegen gate 报 `UNKNOWN_ADMIN_NAVIGATION_ICON`
  硬失败，禁止静默 fallback。插件只声明语义 id，不贡献 ReactNode/SVG/Lucide 组件；
  扩展 vocabulary 属 Surface 治理。
- 参考插件 `reference-resources` 使用固定路径完成浏览器验证，不引入 `[param]` 动态路由
  （Static Export Host 对动态路由硬失败）。
