# Admin Product-Surface Foundation

`packages/admin-foundation` 是首个成熟 Product-Surface Foundation，只依赖 Universal Foundation。

- `layout`：AdminPage、Header、Toolbar、Filter、Section、Split View、Sticky Actions。
- `shell-navigation`：Router Port 上的 Shell Grid、Sidebar Navigation 与响应式表现；不依赖 Next。Branch 使用整行 Disclosure Button，active 与 expanded 正交，只有 Leaf 触发路由。Compact Sidebar 使用非模态 Submenu Flyout：Pointer Hover 不转移焦点，Trigger/Content 共享关闭走廊，Keyboard Press 与 Escape 继续由 Overlay Contract 管理。
- `collection`：Collection 区域、筛选、结果、分页与 Bulk Action。
- `detail-settings`：Entity Summary、Settings Layout、Timeline。
- `form-actions`：Create/Edit/Settings 的 lifecycle 与 sticky action composition。
- `states-operations`：与 Universal 一致的 loading/refreshing/background readiness、Admin 专属 partial/readonly/denied/pending、四类结构化 Page Loading 与 Operation 恢复语义；不实现后端任务。
- `styles.css`：Admin-owned spacing/layout token 与 screen/content/bulk/state Motion Recipe。

`/admin-patterns/*` 是公共 Pattern authority；`/admin-reference/*` 只证明七类完整 Page Archetype。Feature 仍拥有字段、Schema、数据、权限、i18n 和状态选择，Foundation 不创建万能 CRUD Page。

## 与 Framework / Surface 的分工

- `packages/admin-foundation`：**可复用视觉与交互**——Layout、Shell 表现、Pattern、State/Motion Recipe；组件只接收业务已决定的内容、状态与动作。
- `packages/admin-framework`：**契约与纯模型**——Plugin Contract、Route Target、Registry（canonical hierarchy / navigation inheritance / breadcrumb / command / permission）、Host Capability；不依赖 React Router/Next，不读取 pathname。详见 [Admin Framework 与 Surface File Routes](admin-framework.md)。
- `surfaces/admin`：**具体 Surface 插件实现**（private workspace）。它组合 foundation 的视觉与 framework 的契约；`plugins/*` 不是公共 API，生成物位于 `generated/`。
- Host（`apps/admin-web`）是唯一把 foundation/framework/surface 装配成可运行应用的地方。

Foundation 不得依赖 Framework 的生成物，也不得反向要求 Host 提供实现；运行时差异通过 Host Port 注入。
