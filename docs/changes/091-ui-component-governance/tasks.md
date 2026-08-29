# 091 任务与证据

## 研究与计划

- [x] R091-001 组件来源审计与原生控件排查；证据：`research/R091-001-component-source-audit/`（组件来源清单、原生控件定位、保留/重构/替换结论）。
- [x] R091-002 TailAdmin 设计规律研究；证据：`research/R091-002-tailadmin-design-study/`（统一组件来源/克制表面层级/一致控件度量/稳定内容边界；web_search 不可用，为内部复核并标注）。
- [x] PLAN-091-001 完成需求、详细设计与任务清单；证据：`requirements/`、`design/`。
- [x] CONFIRM-091-001 用户确认 091 当前方案；前置：全部研究和计划已完成；完成条件：用户在本计划报告之后明确确认；证据：用户消息（确认 091 计划，开始实施）+ 本目录 README 状态更新。

## 实施基线

- [x] BASELINE-091-001 记录确认时 revision 与 Git 状态；前置：CONFIRM-091-001；完成条件：记录当前 commit 与工作区状态，确认用户未提交改动不受影响；证据：revision `de1e2d9`（与 R091-001/002 快照一致，无漂移）+ 工作区状态（用户改动保持不变）。

## 统一控件实现

- [ ] UI-091-001 实现 FilterBar select 分支统一（紧凑 HeroUI Select，替代原生 `<select>`）；前置：CONFIRM-091-001；完成条件：FilterBar 的 select 控件渲染为 HeroUI Select（含 Trigger/Popover/ListBox/键盘/ARIA），`FilterBarField` 契约不变；证据：单测 + 视觉 E2E。
- [ ] UI-091-002 实现 Pagination pageSize 控件统一；前置：CONFIRM-091-001；完成条件：Pagination 的每页条数下拉为统一 Select；证据：单测 + E2E。
- [ ] UI-091-003 实现宿主语言切换统一（AppHeader + AppShell）；前置：CONFIRM-091-001；完成条件：两处语言切换下拉为统一 Select（保持图标形态）；证据：E2E。
- [ ] UI-091-004 实现 DataTableRowMenu 自研 popover → HeroUI DropdownMenu；前置：CONFIRM-091-001；完成条件：行菜单弹出层为成熟 DropdownMenu（Portal/定位/键盘/焦点），危险项隔离保留，`renderRowMenu` 契约不变；证据：单测 + E2E。
- [ ] UI-091-005 实现 data-table-columns 菜单 → DropdownMenu + Check；前置：CONFIRM-091-001；完成条件：列显隐菜单为成熟 DropdownMenu，勾选为统一 Check；证据：单测。
- [ ] UI-091-006 删除 DangerZone 自研 dialog 残留块（双弹层），确认弹层统一为 RAC ConfirmDialog 并保留输入标识符确认语义；前置：CONFIRM-091-001；完成条件：DangerZone 无双弹层、自研 `role="dialog"` 块删除、确认能力（含 inputConfirmation）由 RAC Modal 承载；证据：单测 + E2E。
- [ ] UI-091-007 实现 WorkspaceContextMenu → RAC Menu；前置：CONFIRM-091-001；完成条件：Shift+F10 上下文菜单为成熟 RAC Menu（与溢出菜单同源），自研 `role="menu"` 块删除；证据：单测。
- [ ] UI-091-008 实现 ThemeDrawer 自研 tab → RAC Tabs；前置：CONFIRM-091-001；完成条件：ThemeDrawer 面板切换为成熟 Tabs（键盘/焦点管理）；若与面板交互冲突则记录为后续项；证据：单测。

## 页面替换

- [ ] PAGE-091-001 迁移 MenusPage 父级 select → SelectField、number input → Field；前置：UI-091-001；完成条件：页面无原生 select/number；证据：typecheck + 扫描。
- [ ] PAGE-091-002 迁移 AuditPage pageSize select → 统一 Select；前置：UI-091-002；完成条件：页面无原生 select；证据：扫描 + E2E。
- [ ] PAGE-091-003 迁移 ApiTokensPage scope 原生 checkbox → Check；前置：CONFIRM-091-001；完成条件：页面无原生 checkbox；证据：typecheck + E2E。

## 样式与 Token

- [ ] STYLE-091-001 删除被替换的自研 CSS（data-table-row-menu-popover、data-table-columns details/summary、danger-zone-confirm 自研、workspace-context-menu 自研）；前置：UI-091-004/005/006/007；完成条件：旧 CSS 零残留；证据：grep 扫描。
- [ ] STYLE-091-002 统一筛选控件度量（control-height/radius/gap/focus 全部走 token，FilterBar 内 select/input/switch 高度一致）；前置：UI-091-001；完成条件：FilterBar 控件一致遵守 `--control-height-sm` 等 token，无 magic number；证据：样式扫描 + 视觉 E2E。

## 验证与收尾

- [ ] VERIFY-091-001 全量验证：`pnpm typecheck`、`eslint .`、`vitest`（不回归 251）、`lint-architecture`、`build`、mock E2E（不回归 19）、Go 侧适用验证；前置：全部实施任务；完成条件：全绿；证据：命令与结果。
- [ ] VERIFY-091-002 代码层二次扫描：业务页面与宿主无用户可见原生 `<select>`、无页面级原生 checkbox、无自研 popover/dialog/menu 残留；前置：全部实施任务；完成条件：grep 证据记录；证据：扫描输出。
- [ ] CLEANUP-091-001 删除已替换的自研组件旧实现（不留双轨）；前置：UI-091-004/005/006/007、PAGE-091-*；完成条件：旧实现零引用；证据：grep 扫描。
- [ ] DOC-091-001 同步 `docs/development/webui.md` 组件来源层级与"禁止页面级重复造轮子"原则；前置：CLEANUP-091-001；完成条件：文档记录当前组件来源层级与统一控件契约；证据：文档 diff。
- [ ] GIT-091-001 按仓库规则审阅、精确暂存并提交本任务；前置：全部验证通过；完成条件：Conventional Commit 哈希；证据：提交哈希。

## 范围外（记录，不实施）

- RouteSearch 的 RAC ComboBox 替换（可选后续）。
- TreeView 的 RAC Tree 替换（业务复合，保留）。
- AuditPage datetime-local 的 DatePicker 替换（后续项，本任务仅样式统一）。
