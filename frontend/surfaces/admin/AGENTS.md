# Admin Surface 实现约束

本目录是 `@community-go/admin-surface`（private workspace）：只承载 Admin Surface 的
Plugin 业务、shell 模型、Group Alias / icon vocabulary 与 generated 产物，为
dependency ownership、module resolution、typecheck 与 test 服务。

- 具体 Plugin 不是 Package，也不是 Surface 公共 API。对 Host 只开放
  `./shell`、`./icon-presentation`、`./icon-components`、`./generated/composition`、
  `./generated/catalog`、`./plugin-routes/*`；
  禁止把 `plugins/*` 加入 exports，禁止通过相对路径绕开 generated shim 导入 Plugin internals。
- Route Catalog、业务 Route IDs 与 module shims 全部位于 `generated/`；
  产物带 `// @generated` 头，**禁止手改**——修改后运行 `pnpm codegen:admin` 重新生成，
  并用 `pnpm codegen:admin:check` 复核 freshness。
- Plugin `routes/` 是一块 Next App Router 子树：page/layout/template/loading/error/
  not-found 均为可选 special file（按需存在），采用 **default export**（Next 惯例）。
  Plugin 内部按正常 Next 开发方式书写；普通导航可用 `next/link`/`next/navigation`
  （受控白名单），跨 Plugin 稳定引用可用 `route()`（`@community-go/admin-framework/target`，
  Server/Client 均可 import）/`AdminRouteLink`/`useAdminNavigation`/`useAdminLocale`
  （`@community-go/admin-framework/plugin`，client）。
- `route.meta.ts` 是可选伴生 metadata（有 page 才允许，非 Next special file，永不
  镜像进 Host）：只保留 titleKey / permissions / canonicalParentOverride /
  activeNavigationOverride；**不声明 navigation**（Sidebar 贡献迁移到
  plugin.navigation.ts）；override 必须同 Plugin 并附 rationale。
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
