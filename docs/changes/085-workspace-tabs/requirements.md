# 085 需求规格：Workspace Tabs

引用研究：[R085-001](research/R085-001-current-workspace-tab-boundary/report.md)。

## 1. 目标

在不恢复菜单访问历史标签的前提下，为 WebUI 增加有界的 Workspace Tabs：只有模块显式声明的独立工作上下文才能生成标签；标签能够在切换时保留真实内存工作状态，并提供固定、恢复、关闭其他、溢出清单、未保存保护与低敏状态持久化。

## 2. 功能要求

| ID | 要求 |
| --- | --- |
| `REQ-085-001` | route 必须通过 typed `WorkspaceTabPolicy` 显式 opt-in；默认 `disabled`。普通菜单访问、列表、设置分区、详情 Drawer、编辑 Drawer 和普通子路由不得自动生成标签。 |
| `REQ-085-002` | policy 至少区分 `disabled`、`singleton`、`contextual`。singleton 以 route ID 去重；contextual 必须提供稳定 context ID，缺失时拒绝创建且不得回退为访问历史。 |
| `REQ-085-003` | 标签栏为 40–44px 高紧凑文本式布局，无 Card 外框；Active 用底部指示线；文本不换行并省略；关闭按钮只在 hover、focus-within 或 active 时显示。 |
| `REQ-085-004` | 支持 pin/unpin、恢复最近关闭、关闭当前、关闭其他、关闭右侧和溢出列表；pinned 默认不被“关闭其他/右侧”影响，dirty 标签未经确认不得关闭。 |
| `REQ-085-005` | 打开标签默认硬上限 12、最近关闭历史上限 10；达到上限拒绝创建并引导用户管理现有标签，不静默淘汰。标签禁止换行，空间不足进入可访问的溢出清单。 |
| `REQ-085-006` | 页面通过 runtime SDK 窄契约报告 dirty、关闭前决策与 active 状态；宿主统一处理关闭、批量关闭、logout 和 browser unload。dirty 必须来自仍保留的真实工作状态，不能只保留视觉标记。 |
| `REQ-085-007` | 切换标签时保留已打开 workspace panel 的 mounted 状态；inactive panel 不可聚焦/交互，模块能够依据 active 信号暂停轮询、订阅与高成本绘制。 |
| `REQ-085-008` | 使用版本化 `localStorage` 保存低敏标签元数据并按 principal 隔离；不得保存草稿值、凭据、响应 body、任意 query、错误文本或 dirty。存储不可用/损坏/过期时安全降级到内存与空状态。 |
| `REQ-085-009` | 恢复时重新通过当前 manifest 的 access、delivery、availability 与 policy 校验；已撤权、已删除、不可用或无法解码的上下文丢弃，不绕过服务端授权。 |
| `REQ-085-010` | 遵循 WAI-ARIA Tabs 的 tablist/tab/tabpanel、aria 关联和 roving focus；支持 Left/Right、Home/End、Space/Enter、Delete 与 Shift+F10/上下文菜单，关闭后焦点目标确定。 |
| `REQ-085-011` | 首批 production opt-in 只覆盖经确认的独立工作区；建议 `openapi.workspace=singleton`。Accounts/Roles/Permissions/Sessions/ApiTokens/Settings/Organization/Navigation/Ops 普通页面保持 disabled。 |
| `REQ-085-012` | 现有 `.workspace-tab*` 样式、`workspace-tabs` zone、滚动注释和旧主题迁移残留必须逐项迁移或删除；不得保留新旧两套全局标签实现。 |

## 3. 非目标

- 不把浏览器 history、菜单 history 或 breadcrumb 替换成标签。
- 不把 Drawer/Inspector/页内 SectionNav 强制升级为标签。
- 不实现服务端草稿、IndexedDB 草稿、跨设备同步或多窗口实时合并。
- 不恢复旧的 refresh action；刷新涉及 dirty 时必须由页面自己的受控动作处理。
- 不重构 OpenAPI 模块内部的接口标签；它与宿主 Workspace Tabs 是不同层级。
- 不新增第三方状态管理库。当前 React、React Router、RAC/HeroUI 与 Web Storage 足够承载首批需求。

## 4. 验收标准

1. 连续访问所有 disabled route 不新增标签；重复打开 singleton 不重复；contextual fixture 同 context 去重、不同 context 分离。
2. 标签视觉在 1440×1000、1024×768、390×844 的 light/dark 下满足高度、指示线、关闭显隐、不换行与溢出要求。
3. dirty fixture 在切换标签后值仍存在；关闭/关闭其他/logout/unload 都触发一致保护，确认后才卸载。
4. 12 个标签达到上限后第 13 个被拒绝且无静默丢失；pinned/dirty 不被批量动作越权关闭。
5. reload 后只恢复允许的低敏元数据；切换 principal、撤权、manifest route 删除、坏 JSON、storage throw 均 fail closed 且导航仍可用。
6. 键盘与屏幕阅读语义通过组件测试与 Playwright：roving focus、手动激活、Delete、上下文菜单、关闭后的焦点目标及 inactive panel 不可交互。
7. Go contract、manifest projection、生成 TypeScript、WebUI unit/mock E2E/build/lint/docs guard 全绿；相关当前 authority 同步更新。

## 5. 待确认决策

| ID | 决策 | 计划值 |
| --- | --- | --- |
| `DEC-085-001` | 是否以独立工作上下文例外取代 083 的“全局 Tab Bar 移除”当前设计 | 是；保留“禁止访问历史标签”的原判定 |
| `DEC-085-002` | 首批 production opt-in | 仅 `openapi.workspace` singleton；contextual 用受控测试 fixture 证明契约 |
| `DEC-085-003` | mounted panel 与资源边界 | 采用，上限 12；inactive 信号要求模块暂停副作用 |
| `DEC-085-004` | 持久化范围 | `localStorage` 低敏元数据、按 principal 隔离；不保存 dirty/草稿 |
| `DEC-085-005` | 数量边界 | open 12、closed history 10；达到上限拒绝，不自动 LRU 淘汰 |
