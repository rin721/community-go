# Admin Product-Surface Foundation

`packages/admin-foundation` 是首个成熟 Product-Surface Foundation，只依赖 Universal Foundation。

- `layout`：AdminPage、Header、Toolbar、Filter、Section、Split View、Sticky Actions。
- `shell-navigation`：Router Port 上的 Shell Grid、Sidebar Navigation 与响应式表现；不依赖 Next。Branch 使用整行 Disclosure Button，active 与 expanded 正交，只有 Leaf 触发路由。Compact Sidebar 使用非模态 Submenu Flyout：Pointer Hover 不转移焦点，Trigger/Content 共享关闭走廊，Keyboard Press 与 Escape 继续由 Overlay Contract 管理。
- `collection`：Collection 区域、筛选、结果、分页与 Bulk Action。
- `detail-settings`：Entity Summary、Settings Layout、Timeline。
- `form-actions`：Create/Edit/Settings 的 lifecycle 与 sticky action composition。
- `states-operations`：Pending Operation 与恢复语义，不实现后端任务。
- `styles.css`：Admin-owned spacing/layout token 与 screen/content/bulk/state Motion Recipe。

`/admin-patterns/*` 是公共 Pattern authority；`/admin-reference/*` 只证明七类完整 Page Archetype。Feature 仍拥有字段、Schema、数据、权限、i18n 和状态选择，Foundation 不创建万能 CRUD Page。
