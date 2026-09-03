# Admin Framework 与 Surface File Routes / Sidebar Navigation

本主题的当前唯一 authority。实现证据与决策历史见
[101 变更记录](changes/101-admin-surface-file-routes/README.md)；本文件只描述当前有效设计与使用方式。

> **最高架构判定标准**：这是一个被拆成很多可自动装配业务块的 Next.js 项目，而不是
> Plugin Framework 寄宿着 Next。「没有 Plugin 化时原本是 Next 负责的（页面、Layout、
> Loading、Error、Not Found、params、searchParams、Server/Client、metadata、路由
> 生命周期），Plugin 化之后也不重新实现。」Framework 只补充 Next 不知道的 **Plugin
> 管理信息**（自动发现、pluginId/mount、稳定 routeId、Navigation、Permission
> metadata、冲突/拓扑诊断、Host 部署能力、ownership、ADD/REMOVE 自动收敛）。

## 1. 分层与所有权

```text
packages/admin-framework      契约层：Plugin Contract、Route Target、Registry、
                              Diagnostics、Host Port / Host Capability、
                              Navigation Resolution（Group → Parent → Child）
surfaces/admin (private)      Surface 实现：plugins/*（业务 + plugins/navigation-groups.ts
                              Group Alias 公共契约）+ src/（shell、icon vocabulary、
                              composition）+ generated/*（codegen 产物）
apps/admin-web                Runtime Host：Next Router、Shell 装配、Host Navigation/Locale
                              Port、i18n 聚合、Registry 派生导航消费
```

- **唯一真实 Router 与 Route Lifecycle authority 是 Next.js App Router。** Framework
  不读取 pathname、不维护 history、不创建导航栈、不复制 Next Route Runtime，也不
  重新实现 layout/template/loading/error/not-found 等 Next 生命周期。
- `packages/admin-foundation` 与 `packages/admin-framework` 职责不同：
  foundation 拥有可复用 Admin 视觉/Pattern/Shell 表现；framework 拥有契约与纯模型
  （Registry、Navigation Resolution、Host Capability、Route Target），不依赖 React Router/Next。
- `surfaces/admin`（`@community-go/admin-surface`）是 private workspace，只为 dependency
  ownership、module resolution、typecheck 与 test 服务。具体 Plugin 不是 Package，
  也不是 Surface 公共 API。

### Surface 对 Host 只开放

- `@community-go/admin-surface/shell`
- `@community-go/admin-surface/icon-presentation`、`/icon-components`
- `@community-go/admin-surface/generated/composition`
- `@community-go/admin-surface/generated/catalog`
- `@community-go/admin-surface/plugin-routes/*`（Generated Adapter 的 (A) 层公共 shim）

禁止公开或直接导入：`@community-go/admin-surface/plugins/*`、对应相对路径、
以及其它能够绕过 generated shim 的 Plugin internals。具体 Route Catalog、
业务 Route IDs 与 generated module shims 全部位于 `surfaces/admin/generated/`，
不得生成到 `packages/admin-framework`（Framework 只定义可扩展 Catalog protocol，
由 Surface generated catalog 提供当前 Admin Surface 的具体类型扩展）。

## 2. 运行时上下文

```text
Host Ports = application runtime context（Composition Root 在 Root Provider 中一次性安装）
```

- `admin-web` Composition Root 一次性安装：Host Navigation Port、Route Target resolver、
  Host Locale Port（Plugin 经 `useAdminLocale` 读写）、当前 Surface Registry。
- Host Navigation Port 使用 Next Link/Router 执行真实导航。
- Generated Adapter（Host 侧，见 §4）**只做 module re-export**：不安装 Host Port、
  不创建 Registry、不发布运行时 route context、不重复执行应用级 Composition。
- Shell 消费 Registry resolved model（Group → Parent → Child + href），active 状态由
  `leaf.href` 与 Next `usePathname()` 匹配（真实 Next Router，无第二套匹配器）。

## 3. Plugin Navigation API 与 Sidebar Navigation Contribution

Plugin 导航方式（按正常 Next 开发方式）：

- 普通静态导航可直接用 `next/link` / `next/navigation`（`useRouter`/`usePathname`/
  `useSearchParams`）——Plugin route 模块在受控 Next 白名单内。
- 跨 Plugin 稳定引用 / 需参数校验时用 Route Target：
  - `@community-go/admin-framework/target`（纯模块，Server/Client 均可 import）：
    `route()`、`AdminRouteTarget`、`encodeSegment`、`resolveTargetHref`。
  - `@community-go/admin-framework/plugin`（client）：`AdminRouteLink`、
    `useAdminNavigation`、`useAdminLocale`、`AdminLocaleProvider`。

```ts
route('users.detail', { id });
```

行为：`route()` 只创建 symbolic target；`AdminRouteLink` / imperative navigation 委托
Root Provider 中的 Host Navigation Port。Route Target 是项目**增强能力**（symbolic
route、跨 Plugin 稳定引用），不是替代 Next 原生导航的强制方式——不为维护它而禁止
Plugin 正常使用 Next Link/Router。

### Sidebar Navigation Contribution（Group → Parent → Child）

**Sidebar 固定模型**：

```text
Group → Parent → Child
- Group   = 侧边栏分组/分隔区域（不是 Route、不是父菜单）
- Parent  = Group 下一级菜单
- Child   = Parent 下子菜单
- groupId            只决定 Node 属于哪个 Group
- Route Tree ≠ Sidebar Tree（不用文件层级替代显式 Navigation hierarchy）
```

**Group Alias（plugins 范围公共 IA）**：`surfaces/admin/plugins/navigation-groups.ts`
集中声明 `system` / `reference` / `development` 等（每项 `{groupId, labelKey, order?}`）。
普通 Plugin **不定义 Group**，只在自身 Contribution 的 `groupId` **选择**既有 Alias；
新增 Group Alias 属 plugins 范围公共 IA Contract 变更，不是单个 Plugin 私有声明。
Shell 不写死 Group。多个 Plugin 可选同一 Group，各自维护自己的 Parent→Child 树。

**Plugin Navigation Contribution**：每 Plugin 根目录 `plugin.navigation.ts`：

```ts
import type { AdminNavigationContribution } from '@community-go/admin-framework/navigation';
export const navigationContribution = {
  parents: [
    {
      navigationId: 'system-tools.root', // 必须 `${pluginId}.` namespace
      labelKey: 'systemTools.nav.root',
      groupId: 'system', // 选择 Group Alias
      iconId: 'settings', // 可选受控 icon vocabulary
      // 有 routeId → Parent 可导航；无 routeId → 纯 Disclosure（点击只展开/收起）
      children: [
        {
          navigationId: 'system-tools.root.icons',
          labelKey: '…',
          routeId: 'system-tools.icons',
          order: 0,
        },
        {
          navigationId: 'system-tools.root.preferences',
          labelKey: '…',
          routeId: 'system-tools.preferences',
          order: 1,
        },
      ],
    },
  ],
} as const satisfies AdminNavigationContribution;
```

约束：

- `navigationId` 必须 `${pluginId}.` namespace（Parent/Child 均如此）。
- Parent/Child 层级用内嵌 `children` 表达；**无 parentNavigationId / 跨 Plugin parent
  概念**；Child 天然属于声明它的 Parent / Plugin / Group（不声明 groupId）。
- Child 必须带 `routeId`；Parent 可带 `routeId`（可导航）或无（纯 Disclosure）。
- **Sidebar 可见 Node 的 routeId 必须静态可解析**（无 runtime params）；动态 `[id]`
  Route 不得直接作为普通 Sidebar target（报 `NAVIGATION_DYNAMIC_TARGET_UNSUPPORTED`）。
- Parent 无 routeId 且无 children → `NAVIGATION_NODE_ORPHAN`。
- `navigation.iconId`（可选）是 Navigation Contribution 的 **semantic presentation
  metadata**（不是 Plugin capability / 能力协商）：合法集合由 Admin Surface icon
  vocabulary（`surfaces/admin/src/navigation-icon.ts`，受控、不动态化）治理；
  iconId → Lucide 组件的**唯一映射**在 `surfaces/admin/src/navigation-icon-components.ts`
  （`@community-go/admin-surface/icon-components`）；Shell resolver 与 Icon 展示页
  消费同一映射。**Plugin 代码不直接 import lucide-react**（Icon 大全页经
  `@community-go/admin-surface/icon-presentation` 的 `AdminNavigationIcon` 消费语义 id）。

Plugin route 模块允许（受控白名单）：import `next/link`、`next/navigation`
（useRouter/usePathname/useSearchParams/redirect/notFound 中 static-export 允许者）
及类型导入。禁止：Browser history、全局 location、直接 import lucide-react（图标经
surface icon API 消费语义 id）；`packages/*` 与 `surfaces/admin/src` 仍禁 `next/*`。

### File Routes 与 Next special file

Plugin `routes/` 是一块 **Next App Router 子树**：page/layout/template/loading/error/
not-found 均为可选 special file（按需存在，可只含 page.tsx），采用 **default export**
（与 Next 一致——开发者写 Plugin routes 的方式与原生 Next app/ 一致，未来可整体拷入）。
公共 Layout/UI/Foundation/表单/组件从共享 packages 复用，Plugin 不重复实现。

## 4. File Routes 与 Metadata

```text
surfaces/admin/plugins/users/            ← 目录名可任意；不承担身份/URL 语义
├── plugin.ts                 export const pluginDefinition = { pluginId, mount } satisfies …
├── plugin.navigation.ts      （可选）Sidebar Navigation Contribution（Parent/Child）
├── i18n.ts                   （可选）export const pluginI18nResources
└── routes/                   ← Next App Router 子树（全部可选，按需存在）
    ├── layout.tsx template.tsx loading.tsx error.tsx not-found.tsx page.tsx
    ├── route.meta.ts         （可选伴生 metadata，非 Next special file，永不进 Host）
    ├── create/page.tsx (+ route.meta.ts 可选)
    ├── [id]/page.tsx (+ layout/loading/error 可选, edit/page.tsx)
    └── settings/page.tsx
```

规则：

- **Plugin 目录名与 `pluginId` 解耦**：目录名只承担磁盘路径，身份/URL/routeId 一律取
  `plugin.ts` 的 `pluginId` + `mount` 声明。URL 只由 `mount + routes/ 文件树` 决定。
- `page/layout/template/loading/error/not-found` 都是可选 Next special file（任意嵌套
  深度），采用 default export；页面可 Server 或 Client（由页面自身决定，无强制
  client bridge）。
- `route.meta.ts` 是**可选伴生 metadata**（有 page 才允许，不强制 1:1；非 Next special
  file，永不镜像进 Host）：只保留 `titleKey`、`permissions`、
  `canonicalParentOverride{routeId,rationale}`、`activeNavigationOverride{navigationId,rationale}`。
  **`route.meta` 不声明 `navigation`**——Sidebar 贡献迁移到 `plugin.navigation.ts`。
- 普通 canonical parent 是最近的祖先 `page.tsx`；特殊 `canonicalParentOverride`
  必须引用同 Plugin routeId 并附 rationale。
- Next special file 之外的路由段语义（catch-all/parallel/route group）本期由 Host
  capability 治理；动态 `[id]` 段 Framework Contract 合法，但当前 Static Export Host
  的部署能力见 §7。

### Route → Sidebar active 关联（隐藏 Route 激活菜单）

- Route 自身的 `activeNavigationId` 由 Registry 派生：routeId 命中某 Sidebar Node
  （Parent/Child 的 routeId）→ 该 Node navigationId；否则沿 canonical hierarchy 找
  最近命中 Node 的祖先 route；`activeNavigationOverride` 显式指向 Node navigationId。
- create/detail/edit 等隐藏 Route 因此仍能激活其 canonical 可见 Sidebar Node
  （机制未重写，只换了数据来源：菜单不再来自 Route 文件树）。
- 找不到任何归属的 Route 判定 orphan（`ORPHAN_ROUTE`）。

## 5. Generator 与 Registry 管线

```text
Discovery → Framework Contract Validation → Static Framework Descriptors
→ Surface Route Catalog（aliases + contributions 序列化）
→ Registry Resolution（Group Alias 聚合 + Parent/Child 拓扑 + routeId→href + 排序）
→ Resolved Navigation（Group → Parent → Child）+ Breadcrumb/Command/Permission → Shell
→ Generated Adapter（surface 公共 shim + Host Next adapter，仅 re-export）
```

- **Generator（`tooling/admin-codegen`）只负责**：Plugin/File Route discovery、
  读取 `plugin.navigation.ts` 与 `navigation-groups.ts`、Metadata 静态提取、
  static imports/descriptors、Surface Route Catalog（含 aliases + contributions）、
  i18n index、Surface generated module shims、Host capability analysis 后的 Next
  re-export adapter。Generator 不生成 resolved Navigation model（只序列化静态声明并做
  Alias/icon gate），不重新实现 Next 生命周期。
- **Generated Adapter 是纯薄接线，两层各一行 re-export**：
  - (A) `surfaces/admin/generated/plugin-routes/<dirName>/<rel>/<kind>.ts` —— surface
    公共 shim（因 `plugins/*` 是 private，Host 只能经 exports wildcard 公共 subpath
    访问）；内容 `export { default } from '<源>'`。
  - (B) `apps/admin-web/src/app/<mount>/<rel>/<kind>.tsx` —— Host Next adapter，只
    re-export (A)：`export { default } from '@community-go/admin-surface/plugin-routes/…'`。
  - 两层都不出现：`'use client'`（除非 Plugin 模块自身）、params 拦截、Context 包装、
    children 包装、生命周期逻辑、第二套匹配器。
- **Registry（`packages/admin-framework`，运行时）统一负责**：`navigation-resolution.ts`
  单一 authority 解析 Group Alias + Parent/Child → `registry.navigation`
  （Group → Parent → Child）；canonical hierarchy、route 级 activeNavigationId 派生、
  breadcrumb topology、command/permission model、Route Target resolution、diagnostics。
- Shell 只消费 Registry resolved model（`convertRegistryToShellNavigation` 把
  group→parent→child 映射为 Shell NavigationGroup[]；Branch=Parent、Leaf=Child/单节点）。

## 6. 确定性 Codegen Bootstrap（preflighted deterministic reconciliation）

- `pnpm codegen:admin` 生成；`pnpm codegen:admin:check` 复核（freshness 纳入 `pnpm check`）。
- **开发期自动发现**：`pnpm dev` 并行运行
  `node tooling/admin-codegen/watch.mjs`（监听 `surfaces/admin/plugins/**`，防抖后自动
  reconcile）+ `next dev`。新增/删除 Plugin、Route 或 Next special file 后**无需手动
  运行 codegen**——watch 完成 reconcile，Next dev 自动感知 `apps/admin-web/src/app`
  变化。`node tooling/admin-codegen/dev.mjs` 是两者编排入口（任一退出即收尾另一）。
- **构建链自动生成**：根 `pnpm build` 前置 `codegen:admin`（确定性、失败即停），
  再 `pnpm -r build`；`pnpm check` 内含 `codegen:admin:check` freshness，CI 拒绝漂移。
- Generator 采用 **preflighted deterministic reconciliation**：先完成全部
  semantic validation、Host capability validation、Group Alias / icon vocabulary gate，
  并在内存中渲染完整 expected artifact plan（catalog / composition / i18n index /
  surface shim / Host adapter，含最终 content），再做物理 ownership preflight；
  全部通过后才执行 mutation（rm/rewrite `generatedRoot`、create/update Host
  artifacts、delete stale owned artifacts、prune 空目录）。
  保证：deterministic failure before mutation / no partial output for preflight failures。
- Generator Ownership Boundary：只有带固定 `GENERATED_HEADER`（首行严格匹配
  `// @generated by tooling/admin-codegen …`）的 Host artifact 归 admin-plugin-codegen
  所有。期望 Host artifact 已存在但不属于本 Generator → `Host artifact ownership
collision`（deterministic fail，不覆盖）；stale 删除只针对 owned artifact。
  手写 App Router 页面（无 marker）既不被覆盖也不被删除。
- Freshness 在内存中重建期望文本并逐文件比较，检测：缺失文件、内容漂移、
  已删除 Route 的残留、不应存在的 Host entry（通用 ownership marker 扫描，
  无具体插件特判）、手工修改 generated 文件、物理 ownership collision。
- 本工具不提供 mutation 开始后的 OS/IO/process interruption staging/transaction
  commit/rollback，不声称 filesystem-level atomicity。

## 7. Static Export Host Capability

固定管线：

```text
Discovery → Framework Contract Validation → Framework Descriptors
→ Host Capability Analysis → Host Route Generation
```

真实 Surface 中的 `[param]` Route：Framework Contract 合法，可进入 descriptors、
Surface Route Catalog 与 Framework tests；但当前 Static Export Host 返回
`UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE`，不为该 Route 生成 Host adapter（或生成后由
capability gate 拦截），Host capability gate 在 Host adapter generation 前硬失败
（不降级为 warning、不等待 Next build、不使用 `generateStaticParams` 枚举业务实体）。

```text
Framework Contract Validity ≠ Current Host Deployability
```

当前 Host 只有在能承载全部可达生产 Route 时才能通过发布门禁。
隔离 Framework fixtures 可包含动态 Route，不进入真实 Surface Host capability inventory；
Reference Plugin 使用固定路径完成浏览器验证。

## 8. Breadcrumb、Legacy 与 Gates

- Registry 从文件树派生 canonical hierarchy、ancestor routeId、patterns、ancestor href
  与 fallback metadata；动态实体名称由未来 Feature/Runtime presentation enrichment 提供。
- Registry 不定义唯一 Back Target。
- Legacy inventory（后续 Migration Phase）精确冻结 Route、Navigation、Command 与 ownership；
  Plugin/Legacy 的 path、shape、ownership、navigation target 或 command contribution
  冲突均失败，不允许隐式覆盖。
- Architecture Gates 覆盖：Surface private export boundary；Host/Package 直接导入
  Plugin internals；Plugin 对 Framework subpath 的限制；Plugin 到 Shell/Host/Browser
  的非法依赖；Next 白名单位置限定（`next/*` 只允许 admin-web 与 Plugin route 模块）；
  mount/path 冲突；Route/Navigation namespace；跨 Plugin topology reference；
  Route 与 Sidebar 拓扑 diagnostics（orphan/unknown target）；canonical/active override
  rationale；catalog/descriptor/shim/adapter freshness；Static Host capability 在 Host
  adapter generation 前执行；
  **Contribution groupId 必须命中 Group Alias**（`plugins/navigation-groups.ts` 公共
  IA，未知 Alias 报 `UNKNOWN_ADMIN_NAVIGATION_GROUP` 并硬失败，禁止 silent drop）；
  **navigationId 必须 `${pluginId}.` namespace**（`NAVIGATION_NAMESPACE_VIOLATION`）；
  **Sidebar 可见 Node routeId 必须静态可解析**（`UNKNOWN_NAVIGATION_ROUTE_TARGET` /
  `NAVIGATION_DYNAMIC_TARGET_UNSUPPORTED`）；**orphan Parent**
  （`NAVIGATION_NODE_ORPHAN`）；**navigation.iconId 必须命中 icon vocabulary**
  （`navigation-icon.ts` 单一 authority，未知报 `UNKNOWN_ADMIN_NAVIGATION_ICON`，
  禁止静默 fallback）；**Host artifact ownership collision**（期望 Host entry 已存在
  且不属于 admin-plugin-codegen → deterministic fail，mutation 前 preflight 拦截）。

## 9. 参考验证

- `reference-resources`：Group `reference` 下单一可导航 Parent（`routeId` → 列表
  Route，`iconId: 'resource'`）；create/detail/edit 保持 Route，经 canonical
  hierarchy 关联到该 Parent 的 `activeNavigationId`；Link / imperative navigation
  使用 Route Target API；Root Provider 只安装一次 Host Navigation Port。
- `system-tools`：Group `system` 下纯 Disclosure Parent `system-tools.root`
  （无 routeId，Shell 点击只展开/收起）→ Child Icon 大全（`icons`，经
  `AdminNavigationIcon` 渲染受控 vocabulary）+ Child 偏好设置（`preferences`，
  经 `useAdminLocale` 读写 locale；从 Host apps/admin-web 物理迁入）。
- Shell 不再按 navigationId/pluginId 手工映射业务图标（统一 iconId → 唯一
  components map resolver）；Sidebar 只渲染 Registry resolved model。

## 10. 本阶段范围与后续阶段

**架构目标（最终收敛方向）**：每个 Plugin = 一个自描述、可完全自动增删的 Next.js
业务子应用（目录名任意，pluginId/mount/Sidebar/i18n 由 Plugin 根声明；`routes/` 是
尽可能完整的 Next App Router 子树）。Built-in 只保留 Runtime Essential（删掉所有业务
Plugin 后 Shell 仍能启动/导航/处理异常所必须：404/Error/Loading/Permission
fallback/Shell bootstrap/Plugin unavailable fallback）；Surface/Product Module
（Preferences、Icon Catalog、Foundation Showcase、Reference Resources、未来业务）
统一走 Plugin Contract，可独立安装/删除/演进。当前 Host 静态 foundation 展示页
（ui-elements/admin-patterns/admin-reference/foundations/motion/states/overview）
是**过渡**：其依赖 Host-private 能力，需先经稳定 Contract/Port 解耦，再整理为
官方 `foundation-reference` Reference Plugin（展示 Foundation 能力 + 标准 Plugin
示例）；不保留 "Legacy static business/reference pages + Plugin pages" 长期双轨。
Preferences 已完成迁移（system-tools），/preferences 旧路由与静态入口已清除。

本主题当前实现范围包括：Framework、Navigation Resolution、Group Alias 公共契约、
Surface private boundary、reference-resources + system-tools、generator
（special-file 子树扫描 + 两层薄 re-export adapter）、watch/dev 自动 reconcile、
Registry、gates、icon presentation。以下内容**尚未实现**：foundation 展示页插件化
迁移、完整 Command/Permission 呈现、Host 侧按路径查 registry 的 breadcrumb/title
注入（Route Context 已删除）等（见上文过渡方向）。本文不把这些延期内容描述为已实现。

## 11. 使用入口

- 新增 Plugin 与 File Route：先读本文件 §4 与 §5，再按
  [Foundation 扩展治理](foundation-extension-governance.md) 走顺序；
  目录级约束见 `surfaces/admin/AGENTS.md`。
- 修改 Framework 契约/Registry：见 `packages/admin-framework/AGENTS.md`；
  公共导出登记在 `tooling/foundation-contracts.json`。
