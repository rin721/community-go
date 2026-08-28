# 085 Workspace Tabs：有界独立工作上下文

## 状态

**已确认，实施完成（本变更含计划确认与全部实现任务）。**

本变更把用户提出的顶部标签方案定义为 Workspace Tabs，而不是恢复 083 已删除的“访问过一个菜单就新增一个标签”的历史记录。标签只承载显式声明的独立工作上下文；普通列表、设置分区、详情查看和编辑继续优先使用当前工作区、Drawer 或子路由。

本轮属于纯文档交付例外：只新增研究与计划文档并更新变更索引，可以在研究和计划门禁通过后提交；后续实现仍须在本报告之后获得用户对当前任务与任务 ID 的明确确认。

> 实施确认：用户经目标指令「确认 085 方案，实施」明确确认当前计划与 DEC-085-001..005，本变更已完成实现、验证与 authority 同步。实施细节与逐任务证据见 [tasks.md](tasks.md)。

## 研究结论

- 当前 `AppShell` 只有一个 `<Outlet />`，没有 Workspace Tabs 状态机；083 于 commit `6c7bd338` 删除了旧 `visitedRouteIDs`、`WorkspaceTabs.tsx` 与固定 Footer。
- 旧实现按所有已访问 app route 自动追加标签，只支持 route ID 去重、关闭、刷新与键盘切换；不支持资格声明、固定、恢复、关闭其他、溢出清单、未保存状态、持久化或数量上限，不能直接恢复。
- 当前仍残留 `.workspace-tabs/.workspace-tab*` 样式、`workspace-tabs` zone 和滚动注释。实施时必须以新契约单轨重建或清理，不能把残留当成当前能力。
- 当前 route manifest 没有“独立工作上下文”语义。应由模块在 `Route` 上显式声明 `WorkspaceTabPolicy`；默认禁用，宿主不得从菜单访问历史推断资格。
- 未保存状态要求非活动工作上下文仍保留组件状态。方案采用有上限的 mounted panel，而不是把任意表单数据塞入全局 `any` store；只持久化低敏标签元数据，不持久化草稿、凭据或 `dirty` 标记。

详见 [R085-001](research/R085-001-current-workspace-tab-boundary/report.md)。

## 计划摘要

1. 扩展构建期 `Route` 与 manifest，增加默认关闭的 typed `WorkspaceTabPolicy`。
2. 在宿主建立 `WorkspaceRegistry`、`WorkspaceTabs`、溢出/上下文菜单与 mounted `WorkspaceOutlet`；普通路由不生成标签。
3. 通过 `@webui/sdk/runtime` 提供窄的 session 生命周期契约，支持 dirty、active、关闭确认与页面卸载保护。
4. 标签 40–44px 高、文本式、无 Card 外框；Active 仅用底部指示线；关闭按钮仅在 hover/focus-within/active 时出现；不换行。
5. 支持固定、恢复最近关闭、关闭其他、溢出列表与版本化 `localStorage` 元数据恢复；硬上限默认 12，不静默淘汰。
6. 首批只允许明确认定为独立工作区的 route opt-in；当前建议以 `openapi.workspace` 作为 singleton 验证实例，其他现有列表/设置/详情页面保持禁用。

## 阅读顺序

1. [研究档案](research/R085-001-current-workspace-tab-boundary/report.md)
2. [需求](requirements.md)
3. [设计](design.md)
4. [任务与确认状态](tasks.md)
