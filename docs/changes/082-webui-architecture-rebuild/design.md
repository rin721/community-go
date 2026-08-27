# 082 设计方案：WebUI 产品架构与 UI 体系重构

引用研究：[R001](research/R001-webui-current-state/report.md)、[R002](research/R002-backend-capability-map/report.md)、[R003](research/R003-proposal-gap-analysis/report.md)。需求见 [requirements.md](requirements.md)（REQ-082-001..025 与 DEC-082-001..006）。方案输入为 `docs/changes/temp-new-changes.md`（81 章「前端产品能力系统性重构」纲领，commit `3b758bd`，下称「方案」）。

## 1. 背景与目标形态

当前 WebUI（React 19 + Vite 7 + HeroUI v3 + Tailwind v4）已经具备 Admin Shell、生成式路由、zone 注入点、动作级权限投影、Token 体系、Ops 监控等能力（R001）。方案（81 章）的多数主题已由 059–081 实现或部分实现（R003：已满足 28 节、部分满足 42 节、未满足 4 节、候选 6 节，编号映射见 R003 §4.11）。082 的目标不是推翻现状，而是**在既有权衡边界内把差距收敛为「平台语义组件 + 页面模式迁移 + 打磨验收」三段交付**，并**吸收新版方案新增的成熟度要求**（Query/Mutation 统一、Backend 错误分类、Frontend Adapter 层、Session 管理、性能与三层 QA、复杂度匹配），明确否决后端不存在的 fake 能力。

## 2. 方案对比与总体策略

| 维度 | 策略 | 结论 |
| --- | --- | --- |
| 承载架构 | 延续静态插拔（062）：Binding 声明 → 生成 registry → Manifest 投影；不引入微前端/运行时插件 | 062 已确认，082 只扩展语义组件与页面，不改插拔主线 |
| 组件栈 | HeroUI v3 + RAC + 自研语义原语单轨（068/069）；新增语义组件（CodeText/TreeView/LogTable 等）继续走 `@webui/sdk/ui` 导出 | 068 单轨；082 补齐语义层，不引入第二套栈 |
| 数据约束 | 页面↔operation 映射以 R002 的 55 operation/23 权限键为唯一事实来源；无后端能力 → 省略或不可用态，禁止 fake（方案「六十五」= AGENTS 红线） | 方案原则 A/B 双约束 |
| 批量操作 | 仅对真实批量语义（sessions.revoke 按 IDHash 批量）实现批量 UI；其余对象不提供假批量 | 十七 重述 |
| IA 归位 | audit→Governance、openapi→Developer 仅为 manifest 菜单声明调整（不新增能力） | 八 重述，DEC-082-004 |
| WorkspaceTabs | 产品决策（DEC-082-001）：保留或删除，禁止双轨（方案「十二」） | 决策点 |
| 表单库 | RHF/zod 启用或移除声明依赖（DEC-082-002），禁止悬置（方案「二十三」） | 决策点 |
| 数据获取 | react-query 从 Ops 推广为全模块统一 Query/Mutation 层（方案「七十一」）；模块 api.ts 逐步收敛到统一契约 + Adapter 层（方案「六十三」） | 新增 REQ-082-009/011，DEC-082-006 |
| 复杂度匹配 | 不因「成熟」过度设计：Export/Batch/Advanced filters/DnD/Analytics/Realtime 仅当真实需求；简单功能保持简单（方案「六十八/六十九」） | 非目标红线 |

## 3. 数据流与实现位置

### 3.1 平台底座（`webui/src/ui`、`webui/src/sdk/ui`、`webui/src/styles.css`、`webui/src/sdk/query`）

```
webui/src/ui/（或新文件）：
  data-table.tsx   -> DataTable 增强：columnVisibility/rowDensity/stickyHeader/rowMenu
                      （基于 HeroUI Table = RAC 底座，保持 wrapperProps/选择列语义）
  filter-bar.tsx   -> FilterBar/SearchInput：Search->Primary filters->Clear->Result count
                      + Empty vs No Results 区分
  form-field.tsx   -> FormField 规格化：Label/Description/Control/Helper/Error + width token
  status.tsx       -> StatusBadge 全状态集（对照 080 Token/会话/账号状态机）
  empty-state.tsx  -> EmptyState 结构化模板（发生了什么/为什么/能做什么）
  error-state.tsx  -> ErrorState 分级（Page/Section/Inline/Action/Permission/Connectivity）
                      + 稳定错误码→message ID→文案链路（不倾倒 500/SQL/JSON）
  danger-zone.tsx  -> DangerZone（后果说明+确认步骤，复用 ActionTrigger/ConfirmDialog）
  code-text.tsx    -> CodeText/CodeViewer（monospace；JSON 用既有 highlight.js 仅 json）
  tree-view.tsx    -> TreeView + InspectorPanel（Org 目录/菜单管理用）
  drawer.tsx       -> DetailDrawer 规格化（宽度档 + Header/Metadata/Actions/Tabs/Sections/Content）
  log-table.tsx    -> LogTable（Audit 列表）
  permission-matrix.tsx -> PermissionMatrix（按 owner 模块分组的权限键勾选矩阵，非 CRUD 硬套）
  skeleton.tsx     -> 分级 Skeleton（Page/Table/Panel/Inline）
webui/src/sdk/query/：
  useWebUIQuery / useWebUIMutation（统一契约：cache/invalidation/error-chain/loading；
    以 Ops 既有的 useGatedQueries 模式为范本，迁移各模块自写 fetch）
webui/src/styles.css：
  token 分区增补 font.*（字号/字重/字体栈 system-ui+PingFang/YaHei/Noto Sans CJK + Inter + monospace）、
  control.*（控件尺寸档）、info/success 语义色（与 081 监控语义对齐）、页面宽度档（settings 720-960/表单 600-760/详情 800-1200）
webui/src/ui/index.tsx：统一 re-export（@webui/sdk/ui 契约不变）
```

- 列表页 URL 状态同步：新增通用 hook（`useListQueryParams`，基于 react-router `useSearchParams`），各列表页过滤/分页/排序读写 URL query；与 FilterBar 组合使用。
- Command Search 入口常驻化：AppHeader 内增加 Command Palette 触发输入框（复用 RouteSearch 的 Modal + Ctrl/Cmd+K），不改变路由检索逻辑；实体检索不纳入（候选）。
- Adapter 层：各模块 `api.ts` 保留为唯一 HTTP 入口，新增 view-model mapper（如权限码 → {label,description,domain,action,technicalCode}），UI 只消费 view model；授权用原始 permission code（REQ-082-011）。

### 3.2 页面模式迁移（各模块 facet）

```
internal/module/iam/binding/webui/web/：
  AccountsPage.tsx     -> DataTable + Create Drawer（Directory 收敛；organization 过滤按 DEC-082-005）
  UserDetailDrawer.tsx -> 聚合 Overview/Roles/Sessions/Security（数据真实；无 Activity）
  RolesPage.tsx        -> Role Detail Drawer（Overview/Members/Permissions）
  PermissionsPage.tsx  -> DataTable + CodeText + Used by Roles（permissions.roles.list）
  ApiTokensPage.tsx    -> Scope 选择按 owner 模块分组 + 搜索（create 时投影创建者可授权限）
  SessionsPage.tsx     -> 按真实字段复核（User/Session/IP/Created/Last active/Expires/Status；无 Device 不生成）
internal/module/auth/binding/webui/web/：
  AuditPage.tsx        -> LogTable 复核（过滤=后端全支持字段）+ AuditDetail Drawer（摘要字段 + CodeViewer）
internal/module/ops/binding/webui/web/：
  DashboardPage.tsx    -> 顶部 Context 行（Environment/Health/Version/Uptime/Last Refresh/Refresh）
                          + 无数据层级（Dependencies/Instances/Host Resources）不可用态
internal/module/organization/binding/webui/web/：
  DepartmentsPage.tsx  -> TreeView + Detail（名称/父级/成员/岗位；无 DnD/Archive）
internal/module/navigation/binding/webui/web/：
  MenusPage.tsx        -> Tree + Inspector 复核（DnD 仅真实 reorder 承载）
菜单归位：internal/module/{auth,openapi}/binding/webui/binding.go 的 Navigation.ParentID 调整（DEC-082-004）
Sidebar：webui/src/components/shell/SidebarMenu.tsx 增加 Group Label 渲染（manifest 已有顶级组概念）；
         styles.css 宽度 token 收敛（DEC 或直接复核）
```

### 3.3 打磨与验收

```
webui/e2e/*.spec.ts：新增 a11y 检查单（Focus/Contrast/Semantic HTML）、列表页 URL 状态 e2e、
  三层 QA（Design/Interaction/Backend Compatibility）e2e 场景
webui/src/ui.test.ts、charts.test.tsx、sdk/query 测试：语义组件与 Query/Mutation 契约 Vitest
docs/development/webui.md：样式 authority 附录（语义色使用规范、font/control scale）、语义组件规范、Query/Mutation 使用契约、页面五问完成标准
```

## 4. 失败语义、并发与审计

- 列表页 URL 状态同步失败不阻塞渲染（query 解析容错，非法值回退默认）。
- 批量吊销失败逐项报告（成功/失败清单），不静默吞错（3.3 错误链）。
- Query/Mutation 统一层：请求取消、防抖、缓存失效语义由契约统一承载；失败按稳定错误码→message ID 链路，不把 500/SQL/JSON 原样倾倒（方案「三十四」）。
- FilterBar/PermissionMatrix 等新增原语均为纯客户端呈现，服务端授权 fail closed 语义不变（认证/授权 authority 不变，R002 §4）。
- 新增语义组件与 Query 层无新后端依赖；审计/账号/令牌等写操作流程沿用既有 CSRF/乐观锁契约。
- 页面五问（方案「七十八」）作为完成标准固化到任务验收，不新增运行时机制。
- 性能红线（方案「七十」）：视觉重构不得降低现有列表/分页/懒加载/代码分割表现；新增能力评估请求次数。

## 5. 已确认决策

（待用户确认后填写；当前为 requirements.md 的 DEC-082-001..006 推荐项。）

## 6. 验证方案

1. 平台底座：语义组件 Vitest（含 URL 状态 hook、DataTable 增强、状态/反馈组件、Query/Mutation 契约）、Playwright 断言按需。
2. 页面迁移：模块页面场景 e2e 断言（Drawer 打开/深链/URL 状态/无 fake 数据视图/Session 无 Device 字段）；Playwright 移动到页面级。
3. 三层 QA：Design QA（跨页面一致性断言）、Interaction QA（状态链）、Backend Compatibility QA（旧能力 read/create/update/delete/authorize/revoke/configure/diagnose 清单核对）。
4. 全量：`go test ./...`、`go vet ./...`、generate:check、typecheck/lint（含 lint:modules/i18n/architecture）、Vitest ≥151、Playwright ≥22、build；docs-guard。
5. 文档：webui 开发指南与 webui/README 同步，documentation-impact.yaml 记录，changes/README 索引更新。
6. 回归基线：每个已确认任务以「不劣化 Vitest 151 + Playwright 22」为底线；决策点结论影响测试面的按 DEC 结果调整。

## 7. 文件影响总览

- 新增：`webui/src/ui/{data-table,filter-bar,form-field,status,empty-state,error-state,danger-zone,code-text,tree-view,drawer,log-table,permission-matrix,skeleton}.tsx`（或合并文件）+ 对应测试；`webui/src/sdk/query` 统一契约扩展 + 测试。
- 修改：`webui/src/ui/index.tsx`、`webui/src/styles.css`、`webui/src/components/shell/{AppHeader,SidebarMenu}.tsx`、`webui/src/App.tsx`（如需）、各模块 facet 页面（iam/auth/ops/organization/navigation/settings 视 REQ 而定）、各模块 `web/api.ts`（Adapter/view-model 收敛）、`webui/e2e/*`、`docs/development/webui.md`、`webui/README.md`。
- 决策点结论若删除 WorkspaceTabs：删除 `workspace-tabs.tsx` 与相关测试（单轨 3.8）。