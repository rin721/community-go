# Admin Framework 与 Surface File Routes

本主题的当前唯一 authority（101 实施范围）。实现证据与决策历史见
[101 变更记录](changes/101-admin-surface-file-routes/README.md)；本文件只描述当前有效设计与使用方式。

## 1. 分层与所有权

```text
packages/admin-framework      契约层：Plugin Contract、Route Target、Registry、
                              Diagnostics、Host Port / Host Capability、Route Context
surfaces/admin (private)      Surface 实现：plugins/*（业务）+ src/（shell、taxonomy、composition）
                              + generated/*（codegen 产物）
apps/admin-web                Runtime Host：Next Router、Shell 装配、Host Navigation Port、
                              i18n 聚合、Registry 派生导航消费
```

- **唯一真实 Router 是 Next.js App Router。** Framework 不读取 pathname、不维护 history、
  不创建导航栈、不复制 Next Route Runtime。
- `packages/admin-foundation` 与 `packages/admin-framework` 职责不同：
  foundation 拥有可复用 Admin 视觉/Pattern/Shell 表现；framework 拥有契约与纯模型
  （Registry、Host Capability、Route Target），不依赖 React Router/Next。
- `surfaces/admin`（`@community-go/admin-surface`）是 private workspace，只为 dependency
  ownership、module resolution、typecheck 与 test 服务。具体 Plugin 不是 Package，
  也不是 Surface 公共 API。

### Surface 对 Host 只开放

- `@community-go/admin-surface/shell`
- `@community-go/admin-surface/generated/composition`
- `@community-go/admin-surface/generated/catalog`
- `@community-go/admin-surface/generated/routes/*`

禁止公开或直接导入：`@community-go/admin-surface/plugins/*`、对应相对路径、
以及其它能够绕过 generated bridge 的 Plugin internals。具体 Route Catalog、
业务 Route IDs 与 generated module bridges 全部位于 `surfaces/admin/generated/`，
不得生成到 `packages/admin-framework`（Framework 只定义可扩展 Catalog protocol，
由 Surface generated catalog 提供当前 Admin Surface 的具体类型扩展）。

## 2. 运行时上下文

```text
Host Ports    = application runtime context（Composition Root 在 Root Provider 中一次性安装）
Route Context = current selected route context（每个 Generated Route Entry 发布一次）
```

- `admin-web` Composition Root 一次性安装：Host Navigation Port、Route Target resolver、
  其它 Browser/Host Runtime Ports、当前 Surface Registry。
- Host Navigation Port 使用 Next Link/Router 执行真实导航。
- Generated Route Entry 只负责：导入受控 generated Surface route bridge、接收并 await
  Next params、转换稳定 Plugin Page props、发布当前 `routeId + params`、
  适配 Page/Layout/Loading/Error module；**不安装 Host Port、不创建 Registry、
  不重复执行应用级 Composition**。
- Shell 订阅 Current Route Context，再通过 Registry 取得 active navigation、Breadcrumb
  与 Permission model。

## 3. Plugin Navigation API

Plugin 只能导入 `@community-go/admin-framework/plugin`，使用：

```ts
route('users.detail', { id });
```

引用应用 Route，不手写 URL。`@community-go/admin-framework/plugin` 提供：

- `AdminRouteTarget`
- Route Catalog protocol / base type
- `route(routeId, params)`（创建 symbolic target，不执行导航）
- `AdminRouteLink`
- `useAdminNavigation`（返回 `navigate(target)` / `replace(target)` / `href(target)`）
- 稳定 Page/Layout/Loading/Error props 与对应 module type

行为：

- `route()` 只创建 symbolic target；Registry 使用 generated descriptors 校验 routeId、
  缺失/多余 params，并逐段编码后构造 href。
- `AdminRouteLink` 与 imperative navigation 委托 Root Provider 中的 Host Navigation Port；
  `admin-web` adapter 使用 Next Link/Router。
- Framework 不读取 pathname、不创建导航栈、不实现 Router。

Plugin 禁止：import `next/*`、`generateStaticParams`、`generateMetadata`、
`dynamic`/`revalidate` 等 Next route config、其它未经 Framework Contract 明确支持的
Next-specific export、Browser history、全局 location、手写内部 URL 完成应用内导航。

### 稳定 Route Module Contracts

Plugin 文件命名借鉴 Next，但不直接暴露 Next Module API。Framework 定义
`AdminRoutePageProps`（稳定 params 与 Route Context）、`AdminRouteLayoutProps`
（稳定 children contract）、`AdminRouteLoadingProps`、`AdminRouteErrorProps`
（标准错误表示与 `retry`，不暴露 Next `reset`）及对应 module type。
Generated Host adapters 负责：Next params Promise → 稳定 params、
Next Error Boundary → `AdminRouteErrorProps`、`reset` → 稳定 `retry`、
必要的 `"use client"` boundary、Next-specific lifecycle 与 module export。

## 4. File Routes 与 Metadata

```text
surfaces/admin/plugins/users/
├── plugin.ts                 export const pluginDefinition = { pluginId, mount } satisfies ...
├── i18n.ts                   （可选）export const pluginI18nResources
└── routes/
    ├── page.tsx
    ├── route.meta.ts
    ├── create/page.tsx + route.meta.ts
    └── [id]/page.tsx + route.meta.ts + edit/page.tsx + route.meta.ts
```

规则：

- Plugin 目录名与 `pluginId` 一致；可声明一个静态 mount，默认 `/<plugin-directory>`，
  允许如 `/system/users`；URL 只由 `mount + routes/ 文件树` 决定。
- `page.tsx` 与同目录 `route.meta.ts` 一一对应。
- `route.meta.ts` 只允许 `navigation{navigationId,labelKey,groupId}`、`titleKey`、
  `canonicalParentOverride{routeId,rationale}`、`activeNavigationOverride{navigationId,rationale}`、
  `permissions`；不得声明 path、普通 parentRouteId 或 page import。
- 普通 canonical parent 是最近的祖先 `page.tsx`；特殊 `canonicalParentOverride`
  必须引用同 Plugin routeId 并附 rationale。
- 支持 static segment、`[param]` 及受治理的 page/layout/loading/error；
  暂不支持 catch-all、parallel/intercept route、route group 和 Route Handler。

### Navigation Inheritance

- 只有声明 `navigation` 的 Route 才进入 Sidebar/Command；Navigation target 从
  File Route descriptor 派生，不单独保存 href。
- Active Navigation：当前 Route 有 visible contribution 用自身 navigationId；
  否则沿 canonical hierarchy 找最近 visible ancestor；找不到时普通 Route 判定 orphan；
  特殊情况使用同 Plugin `activeNavigationOverride + rationale`。
- `routeId`/`navigationId` 使用 `${pluginId}.*`（根 Route = pluginId）；`groupId`
  使用 Admin Surface taxonomy；默认禁止跨 Plugin Route/Navigation/active reference。

## 5. Generator 与 Registry 管线

```text
Discovery → Framework Contract Validation → Static Framework Descriptors
→ Surface Route Catalog / Module Bridges → Registry Resolution
→ Resolved Navigation/Breadcrumb/Command/Permission Models → Shell
```

- **Generator（`tooling/admin-codegen`）只负责**：Plugin/File Route discovery、
  Metadata 静态提取、static imports/descriptors、Surface Route Catalog 类型、
  i18n index、Surface generated module bridges、Host capability analysis 后的 Next thin entries。
  Generator 不生成 resolved Navigation/Breadcrumb/Command/Permission model。
- **Registry（`packages/admin-framework`，运行时）统一负责**：canonical hierarchy、
  navigation inheritance、navigation tree/group ordering、breadcrumb topology、
  command/permission model、Route Target resolution、ownership/legacy/topology diagnostics。
- Shell 只消费 Registry resolved model。

## 6. 确定性 Codegen Bootstrap

- `pnpm codegen:admin` 生成；`pnpm codegen:admin:check` 复核（freshness 纳入 `pnpm check`）。
- Freshness 在内存中重建期望文本并逐文件比较，检测：缺失文件、内容漂移、
  已删除 Route 的残留、不应存在的 Host entry、手工修改 generated 文件。
- 生成过程采用两阶段原子替换（先全部写入 staging，成功后再换入真实位置），
  失败不留下半套 Catalog 或 Route Entry；生成物带 `// @generated` 头，禁止手改。

## 7. Static Export Host Capability

固定管线：

```text
Discovery → Framework Contract Validation → Framework Descriptors
→ Host Capability Analysis → Host Route Generation
```

真实 Surface 中的 `[param]` Route：Framework Contract 合法，可进入 descriptors、
Surface Route Catalog 与 Framework tests；但当前 Static Export Host 返回
`UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE`，不为该 Route 生成真实 Next entry，
Host capability gate 在 Host entry generation 前硬失败（不降级为 warning、
不等待 Next build、不使用 `generateStaticParams` 枚举业务实体）。

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
  Plugin internals；Plugin 对 Framework subpath 的限制；Plugin 到 Shell/Host/Next/Browser
  的非法依赖；Page/metadata 一一对应；Unsupported Next module exports；mount/path 冲突；
  Route/Navigation namespace；跨 Plugin topology reference；Navigation inheritance 与
  orphan Route；canonical/active override rationale；catalog/descriptor/bridge/Next entry
  freshness；Static Host capability 在 Host entry generation 前执行。

## 9. 参考验证

固定路径 `reference-resources` Plugin 验证：list Route 贡献 visible navigation；
create/detail/edit 自动继承 list navigation；edit hierarchy 为 list → detail → edit；
Link 与 imperative navigation 使用 Route Target API；Root Provider 只安装一次
Host Navigation Port；Generated entries 只发布 Route Context；Sidebar/Breadcrumb/Command/
Permission 来自 Registry；Plugin i18n 由 Composition pipeline 聚合；
Host 无法直接 import Plugin internals。

## 10. 本阶段范围与后续阶段

本主题当前实现范围（101）包括：Framework、Surface private boundary、Reference Plugin、
generator、Registry、gates 与最小 Shell bridge。以下内容**尚未实现**，保留到后续
Migration Phase：完整 Shell（Sidebar/Breadcrumb/Command/Permission 全量呈现）、
现有页面与既有静态导航迁移、Legacy Navigation 冻结、Shell CSS、Host 路由迁移清单。
本文不把这些延期内容描述为已实现。

## 11. 使用入口

- 新增 Plugin 与 File Route：先读本文件 §4 与 §5，再按
  [Foundation 扩展治理](foundation-extension-governance.md) 走顺序；
  目录级约束见 `surfaces/admin/AGENTS.md`。
- 修改 Framework 契约/Registry：见 `packages/admin-framework/AGENTS.md`；
  公共导出登记在 `tooling/foundation-contracts.json`。
