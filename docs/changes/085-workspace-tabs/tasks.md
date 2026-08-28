# 085 任务与证据

## 当前门禁

研究门禁已通过；计划已形成并已获用户确认（目标指令「确认 `085` 方案，实施」明确确认当前计划与 DEC-085-001..005），**全部实现任务已完成并通过验证**。本变更包含一套完整实现：Go/TS 契约、registry、持久化、mounted outlet、SDK 窄会话、42px 标签栏、首批 opt-in、单轨清理、验证与 authority 同步。

## 任务清单

| ID | 依赖 | 工作量 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `RES-085-001` | — | M | 复核当前/旧 Workspace Tabs、route/runtime、持久化与 APG 边界 | R085-001 metadata/report 可复核，事实与推断分离 | 完成 |
| `PLAN-085-001` | RES-085-001 | M | 形成 requirements/design/tasks 与索引 | REQ/DEC/文件影响/失败语义/验证齐全 | 完成 |
| `DOC-085-001` | PLAN-085-001 | S | 提交本轮纯文档研究与计划 | docs guard/diff check 通过，只提交 085 与索引 | 完成 |
| `CONFIRM-085-001` | PLAN-085-001 | — | 用户确认当前 085 计划与 DEC-085-001..005 | 计划报告之后收到明确确认 | 完成 |
| `CONTRACT-085-001` | CONFIRM-085-001 | M | 增加 WorkspaceTabPolicy、manifest projection 与校验 | 默认 disabled；未知/非法 policy fail fast；Go/TS contract tests | 完成 |
| `STATE-085-001` | CONTRACT-085-001 | L | 实现 WorkspaceRegistry reducer、identity、cap、pin/close/restore/reconcile | 纯函数测试覆盖 12/10 上限、批量原子性、pinned/dirty 规则 | 完成 |
| `STORAGE-085-001` | STATE-085-001 | M | 实现版本化低敏 localStorage adapter | principal 隔离、坏数据/storage throw/access drift 安全降级 | 完成 |
| `ROUTER-085-001` | STATE-085-001 | XL | 建立 mounted WorkspaceOutlet 与普通 route 分流 | 多 panel 状态真实保留；inactive inert；group layout 不复制/漂移 | 完成 |
| `SDK-085-001` | ROUTER-085-001 | M | 暴露 workspace session 生命周期窄契约 | dirty/beforeClose/active/requestClose typed 且模块不可读全 registry | 完成 |
| `UI-085-001` | STATE-085-001, SDK-085-001 | L | 实现 42px WorkspaceTabs、菜单、溢出与键盘 | REQ-085-003/004/005/010 的 unit/e2e/a11y 通过 | 完成 |
| `ADOPT-085-001` | UI-085-001 | M | 首批 production route opt-in | 只按 DEC-085-002 启用；普通 route 全部不生成 tab | 完成 |
| `CLEAN-085-001` | UI-085-001 | S | 单轨清理旧样式/zone/注释/测试残留 | 搜索旧 dot/refresh/showTabs/visitedRoutes 无无主残留 | 完成 |
| `QA-085-001` | ADOPT-085-001, CLEAN-085-001 | L | 全量功能、视觉、键盘与回归验证 | requirements §4 与 design §9 全部有命令/截图证据 | 完成 |
| `DOC-085-002` | QA-085-001 | M | 更新当前 authority、documentation impact 与任务证据 | webui README/development authority 与真实实现一致 | 完成 |
| `COMMIT-085-001` | DOC-085-002 | S | 审阅、精确暂存并提交确认范围 | Conventional Commit；工作区用户修改未混入 | 完成 |

## 确认证据

- 2026-08-28：用户在计划报告之后以目标指令「确认 `085` 方案，实施」明确确认当前计划与 DEC-085-001..005，`CONFIRM-085-001` 完成，进入实施。

## 实施停止条件（未命中）

- mounted panels 已在现有 Router/group layout 下保持单一路由声明（`renderPanelRoutes` 复用 `renderAppRoutes`，面板用固定 `<Routes location>` 分流，未复制 route 树）。
- contextual identity 不需要把敏感实体信息、任意 query 或业务草稿交给宿主（contextID 只用于相等性，持久化只存低敏 restoreKey）。
- dirty 来自仍保留的真实工作状态（mounted panel 保留组件本地状态，SDK 只注册 dirty 标记）。
- 未新增状态库、数据库、业务 API、权限键或跨窗口同步。

## 实施证据

### CONTRACT-085-001 / ADOPT-085-001（Go + TS 契约）

- `internal/webui/contract.go`：新增 `WorkspaceTabMode`（disabled/singleton/contextual）、`WorkspaceTabPolicy{Restorable}`、`ManifestWorkspaceTabPolicy` 投影；`Route.WorkspaceTab` 零值归一化 disabled；`validateRouteWorkspaceTabPolicy` 拒绝未知 mode、blank 布局/default/unauth-default route opt-in；manifest 仅投影非 disabled。
- `internal/webui/contract_test.go`：`TestWorkspaceTabPolicyProjectionOmitsDisabledAndProjectsOptin`、`TestWorkspaceTabPolicyValidationFailsClosed`。
- `internal/module/openapi/binding/webui/binding.go`：`openapi.workspace` 声明 `WorkspaceTabSingleton, Restorable: true`（DEC-085-002 首批实例）。
- `webui/src/contracts/index.tsx`：`WorkspaceTabPolicy` discriminated union、`ManifestRoute.workspaceTab`、`WorkspaceSession`/`WorkspaceSessionLookup`/`WorkspaceScopeContext`/`useWorkspaceSession` 窄契约；`ZoneID` 移除 `workspace-tabs`。
- `webui/src/sdk/runtime/index.tsx` 转出窄会话与 policy 类型。
- 生成链：`go run ./cmd/app webui generate` 重生成 `webui/src/generated/webui-registry.ts`（mock manifest 含 `workspaceTab` singleton），`generate --check` 通过。

### STATE-085-001（registry）

- `webui/src/workspace/registry.ts`：`MAX_OPEN_WORKSPACES=12`、`MAX_CLOSED_HISTORY=10`；`createWorkspaceID`（singleton route 编码 / contextual route+contextID）；actions `open/activate/deactivate/pin/unpin/close/closeOthers/closeRight/restore/setDirty/reconcile/replace/hydrate`；pinned 左置、dirty 需 confirmed、批量原子性、关闭后右/左邻居激活；`hydrate` 并入而非替换（避免与导航效果 race）。
- `webui/src/workspace/registry.test.ts`：22 个用例（12/10 上限、去重、contextual 缺 id 拒绝、pin/unpin 分组顺序、closeOthers/Right 排除 pinned、dirty 确认、关闭焦点邻居、restore、reconcile 丢弃）。

### STORAGE-085-001（持久化）

- `webui/src/workspace/storage.ts`：单一 host key `community-go-webui-workspace`、`version:1`、principalID payload 校验；allowlist 投影（routeID/pinned/顺序/允许 pathname + `WORKSPACE_SEARCH_ALLOWLIST` 的 search key + 低敏 restoreKey；不保存 dirty/草稿/凭据/任意 query）；parse+schema 校验 fail closed；`setItem` 异常返回 `workspace_storage_write_failed`。
- `webui/src/workspace/storage.test.ts`：9 个用例（allowlist 投影、principal 隔离、坏数据/版本/存储抛错 fail closed、contextual 无 restoreKey 不入存储、round-trip）。

### ROUTER-085-001 / SDK-085-001（outlet 与会话）

- `webui/src/routes.tsx`：从 `App.tsx` 提取 `ManifestRouteView`/`renderAppRoutes`/`ModuleGroupLayout`/`RouteResourceBoundary`/`RouteErrorBoundary`（普通 Outlet 与 panel 共用，不复制业务 route 声明）；`renderPanelRoutes` 只含 workspace route；`WorkspaceRouteSlot` 为 workspace 路由提供 access 门禁骨架（打开由宿主导航效果驱动，避免关闭后重开）。
- `webui/src/workspace/WorkspaceOutlet.tsx`：每个打开 workspace 一个 mounted panel，固定 `<Routes location>` 挂载，inactive `hidden`+`inert`，active `role=tabpanel` + `aria-labelledby`，`WorkspaceScopeContext` + `WorkspaceSessionLookupProvider` 注入窄会话。
- `webui/src/workspace/WorkspaceProvider.tsx`：composition root——`useReducer` registry（折叠 outcome）、principal 变化时 `hydrate`（合并，首次挂载不清存储）、manifest `reconcile`、allowlist 持久化、dirty/beforeClose 统一关闭管线（批量原子 + 一次确认弹窗）、pinned 单关先 unpin、logout/unload 保护（仅 dirty 时注册 beforeunload）、`requestPrepareLogout`。

### UI-085-001（标签栏）

- `webui/src/components/shell/WorkspaceTabs.tsx`：42px tablist/tab/tabpanel、aria-selected、roving focus、Left/Right/Home/End、Space/Enter 手动激活、Delete、Shift+F10 上下文菜单（pin/unpin/close others/close right/restore）；pinned/dirty 图标 + 可访问名称；溢出测量 + RAC Menu 溢出清单；close 按钮 hover/focus-within/active 显隐。
- `webui/src/components/shell/WorkspaceTabs.test.tsx`：6 个用例（关联/aria-selected、键盘激活/Delete、roving focus、pinned/dirty 非颜色语义、上下文菜单、close 可达）。

### CLEAN-085-001（单轨清理）

- `webui/src/styles.css`：旧 `.workspace-tabs/.workspace-tab*` 样式替换为 085 新视觉（`--shell-tabs-height: 42px`）；compact/mobile 旧规则删除；`.workspace-panels[hidden]`/`.workspace-panel-scroll` 新增。
- Go + TS：`workspace-tabs` zone 从 `ZoneID`、`Binding.WorkspaceTabActions`、投影/排序/校验/克隆删除（零真实贡献方，REQ-085-012）；`ScrollExperience` 注释更新。
- 搜索 `workspace-tab-scroll`/`tab-close`/`visitedRoutes`/`showTabs`（代码侧）无无主残留；`theme.test.ts` 旧 localStorage 结构只作为 legacy 迁移 fixture 保留。

### QA-085-001（验证）

- Go：`go build ./...`、`go vet ./...`、`go test ./...` 全绿（含新增 contract tests）。
- WebUI：`pnpm generate:check`（registry 无 stale）、`pnpm lint`（ESLint 0 错误；architecture 扫描通过）、`pnpm typecheck`、`pnpm test`（Vitest 49 文件/236 用例含 085 新增 37）、`pnpm build` 全绿。
- E2E dev（webui.spec.ts）：新增「085 workspace tabs: singleton opt-in, dedup, mounted state and a11y」通过；既有 25 用例通过。
- E2E mock（webui-mock.spec.ts）：新增「085 workspace tab bar: singleton open/restore/close flow」与「085 workspace tabs visual」通过；视觉证据 `test-results/085-workspace-tabs-{desktop,laptop,mobile}-{light,dark}.png` + `085-workspace-tabs-mock.png`（42px/指示线/不换行断言）。
- dev e2e 残余 5 个失败项（setup/org/navigation/067×2）在完整基线（stash 全部 085 改动）下同样失败，属于既有问题，与 085 无关。

### DOC-085-002（authority）

- `webui/README.md`：新增 085 Workspace Tabs 章节（契约/registry/outlet/标签栏/首批 opt-in/清理）。
- `docs/development/webui.md`：新增 085 章节并修正 zone 表与滚动注释。
- `docs/changes/085-workspace-tabs/`：README/requirements/design/tasks 状态与证据同步；`docs/changes/README.md` 索引更新。
- `webui/e2e/webui-mock.spec.ts` + `webui/e2e/webui.spec.ts`：覆盖 085 流程与视觉断言。

## 剩余风险

- contextual 生产 route 尚未出现：契约由 registry/storage 测试与 fixture 证明，真实实体工作台的 context/restore/dirty owner 需独立验收（与计划一致）。
- dev e2e 5 个既有失败项（setup Password 标签重复、org 「Platform」标题等）在本任务前已存在，不属于 085 范围。
- 同源多窗口不做实时合并（last-writer-wins、初始化读一次），已在 adapter 注释与任务证据中说明。