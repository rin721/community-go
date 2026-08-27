# Community Go Admin — 后台产品设计风格基准（Design Baseline）

> 本文件是 Community Go Admin 产品重构的设计风格权威输入（2026-08-27 用户提供）。重构执行时必须在每个页面/组件设计前对照本基准；它定义"成熟企业级 SaaS Admin 后台"应有的产品质感、信息架构、交互与视觉语言，与本仓库 `docs/changes/temp-new-changes.md` 方案（Production-grade 全栈产品重构）配套使用。本文件不替代主题文档 authority，但任何页面/组件实现不得违反其硬性要求。

你现在不是在"美化现有后台页面"，而是在以 **高级产品设计师 + 企业级 SaaS UX 架构师 + 前端架构师** 的身份，对一个后台管理系统进行真正意义上的产品级 UI/UX 重构。

## 一、任务目标

最终目标不是让页面"看起来稍微好一点"，而是把项目设计成：

- 可以真正投入业务使用的成熟 Admin 后台
- 功能结构完整，而不是 Demo、原型或脚手架页面
- 页面信息架构清晰
- 复杂业务有完整工作流
- UI 具有现代企业级 SaaS 产品质感
- 页面能力明显强于原始系统
- 组件具备业务语义，而不是简单堆叠 Button、Card、Input、Table
- 前端设计能够反向补足原项目不成熟的产品逻辑
- 不是机械地根据现有后端接口数量决定前端页面复杂度
- 如果现有页面架构不合理，应重新设计，而不是沿用

不要把"保持原有结构"作为默认原则。如果旧页面存在明显设计问题，应主动推翻并重构。

## 二、产品定位

系统整体定位为：**Modern Enterprise Admin Console**。

设计语言参考现代成熟 SaaS、企业管理平台、云控制台、数据运营平台的设计质量，但不得机械模仿具体产品。

整体视觉关键词：**Professional / Clean / Dense / Structured / Data-first / Functional / Modern / Enterprise / SaaS**。

避免：

- 传统廉价管理后台、Bootstrap Admin 风格、默认 Ant Design 页面
- 大量蓝色按钮、到处都是 Card、大圆角、过度渐变、玻璃拟态、大面积阴影、花哨装饰
- 为了高级感而降低信息密度、"一个标题 + 几张卡片 + 一个表格"式模板页面

设计重点不是装饰。真正的高级感应来自：**信息架构、排版层级、业务流程、组件组合、交互反馈、状态设计、数据表达与视觉一致性**。

## 三、最重要原则：不要把现有页面骨架当成约束

审查当前页面时判断：

1. 当前页面承担什么业务任务？用户为什么进入？
2. 用户最常执行什么操作？哪些是高频？哪些是危险？
3. 哪些信息需要立即看到？哪些是辅助信息？
4. 是否缺少必要管理能力？当前布局是否适合业务？
5. 是否需要拆分页面？是否应增加详情页、Drawer、Modal、Tabs、Wizard、Command Bar？
6. 是否存在"页面只是把 API 数据展示出来，而没有真正形成产品"？

存在以上问题则**直接重新设计页面结构**。不要因为旧项目存在一个 Card 就继续用 Card，不要因为旧项目只有一个 Table 就继续做 Table，不要因为后端只暴露少数接口就认为页面只能有少量功能。前端产品设计应根据完整业务场景推导合理功能；尚未存在的高级能力可以设计前端结构、交互和产品入口，并通过合理的数据模型/API 需求表达其后端支持方式。

## 四、页面设计必须从"业务任务"开始

禁止直接：Header → Card → Card → Table → Button。

应先定义：**User Goal → Workflow → Information Architecture → Functional Components → UI Components**。

例如"用户管理"不能只是"搜索框 + 新增按钮 + 用户表格"，而应根据场景设计为完整的**用户管理工作区**，可能包括：用户总览、用户状态、角色分布、最近新增、异常账户、高级搜索、快速筛选、Saved Views、批量选择、批量操作、用户状态管理、权限入口、用户详情、登录活动、审计日志、标签、Notes、风险状态、操作历史。这些功能不一定全部同时展示，但必须根据业务合理组织。

## 五、禁止"原子组件堆砌式设计"

不要把多个基础组件随便放在一起就称为一个功能。例如 Input + Select + Button 不等于"高级筛选"；Card + Number 不等于"数据分析"。

高级筛选应形成 **Filter Bar / Query Builder / Filter Panel**：搜索字段、条件关系、条件值、快速筛选、Active filters、Clear all、Save view、Reset、Filter count、Expand advanced filters。

数据分析应形成 **Metric Card**：Label、Primary value、Comparison、Trend、Delta、Time range、Tooltip、Mini chart、Status、Drill-down。

设计时优先思考**业务组件**，而不是基础 UI 组件。

## 六、建立复用型 Business Components

### DataTable

不是普通 Table，应包含：Column configuration、Sorting、Filter、Pagination、Row selection、Bulk actions、Column visibility、Density、Sticky header、Empty/Loading/Error state、Inline actions、Context menu、Row detail、Export、Refresh。

### FilterBar

负责：Keyword search、Quick filters、Advanced filter、Active filter chips、Saved views、Reset、Query count。

### EntityHeader

详情页实体头部：Entity title、Status、Metadata、Tags、Quick actions、More actions、Breadcrumb、Context information。

### MetricCard

KPI：Label、Value、Trend、Comparison、Mini visualization、Tooltip、Drill-down。

### StatusBadge

统一表达 Success/Pending/Warning/Error/Disabled/Processing/Archived；禁止每个页面自行设计状态颜色。

### ActivityTimeline

用于操作记录、状态变化、审核历史、系统事件、登录行为。

### DetailDrawer

不要所有数据详情都跳新页面；根据上下文使用 Drawer / Modal / Side Panel / Dedicated Detail Page，保持用户当前工作上下文。

### BulkActionBar

用户勾选数据后形成明显批量操作模式（"已选择 12 个用户 → 修改状态 / 分配角色 / 导出 / 删除 / 更多"），而不是把批量按钮永久塞在页面顶部。

## 七、统一页面模板体系

不同页面不能全部使用一个模板，至少形成以下页面类型：

- **Dashboard**：Context Header、KPI、Trend、Alerts、Operational Overview、Recent Activity、Tasks、Business Insights。
- **List Workspace**（用户/订单/项目/任务/设备等）：Page Header、Tabs、Toolbar、Saved Views、FilterBar、DataTable、Bulk Actions、Detail Drawer。
- **Detail Page**：Breadcrumb、Entity Header、Status、Primary Actions、Summary、Tabs、Activity、Related entities、Audit、Metadata。
- **Configuration Page**：不使用大量独立 Card；左侧 Settings Navigation + 右侧 Configuration Workspace，按 General/Security/Notifications/Integration/Permissions/Advanced 组织。
- **Analytics Page**：Date Range、Dimensions、KPI、Trend Chart、Breakdown、Comparison、Data Table、Insight、Export。

## 八、布局系统

整体结构：Sidebar + Application Header + Content Workspace。

- Sidebar：240px expanded、64–72px collapsed
- Topbar：56–64px
- Content：最大宽度不要机械限制；数据型页面可充分利用屏幕宽度；复杂表格允许接近 full-width；Dashboard 可适当限制阅读宽度
- 统一 8px spacing system：4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48
- 页面主要 section 间距：24–32px

## 九、Sidebar 设计

Sidebar 必须是独立应用导航区域。禁止：Sidebar 把页面整体往下撑、与 content 高度错位、页面滚动导致 sidebar 消失、不同页面 sidebar 高度不同。

推荐：

```css
height: 100vh;
position: sticky;
top: 0;
```

或合理的 fixed application shell。Sidebar 内部独立滚动，Content 独立处理页面高度。导航支持：一级、二级、分组、Collapse、Active state、Badge、Permission-based items。

## 十、Header 设计

Application Header 保持紧凑（不要巨大 Header），可包含：Breadcrumb、Global Search、Command Menu、Notifications、Help、User Menu。页面标题放入 Page Header，而不是 App Header。

## 十一、Page Header

左侧：Breadcrumb、Title、Description、Context metadata；右侧：Primary Action、Secondary Action、Overflow Menu。Primary Action 同一区域一般只保留一个明显主按钮。示例：

```text
Users
Manage users, permissions and account status.
                       Import  Export  + Add User
```

## 十二、视觉语言

- 背景 `#F6F7F9`；Surface `#FFFFFF`；Primary Text `#111827`；Secondary Text `#6B7280`；Muted `#9CA3AF`；Border `#E5E7EB`
- Primary `#4F46E5` 或 `#2563EB`；Success `#16A34A`；Warning `#D97706`；Danger `#DC2626`；Info `#0284C7`

## 十三、圆角规范

不要大圆角：Button 6–8px、Input 6–8px、Card 8–10px、Modal 10–12px。不要大量使用 16/20/24px（否则产生廉价 AI SaaS 模板感）。

## 十四、阴影

默认 Surface 主要依赖 Border/Background/Spacing 而非 Shadow。只有 Popover、Dropdown、Modal、Floating toolbar、Command palette 使用明显阴影；普通 Card 使用极轻 shadow 或无 shadow。

## 十五、字体层级

- Page Title 24–28px / 600；Section Title 16–18px / 600；Card Title 14–16px / 600
- Body 14px；Secondary 13px；Table 13–14px；Label 12–13px；Metadata 12px
- 避免后台系统大量 18px、20px 正文；保持合理信息密度

## 十六、Table 是核心工作区

后台表格必须具备产品级能力：Sticky header、Sorting、Column filtering、Search、Pagination、Row selection、Row action、Column configuration、Density、Loading、Empty、Error、Bulk action、Status display、Hover、Overflow action、Responsive strategy。

操作列不要塞"查看/编辑/删除/设置/复制/更多"；建议主要操作直接显示 1 个，其他放入 `...`，危险操作放菜单末尾并用 separator 隔开。

## 十七、状态设计

所有页面必须考虑：Default、Hover、Focus、Active、Selected、Disabled、Loading、Empty、Error、Success、Permission denied。不要只设计"有数据时"的页面。

## 十八、Empty State

不要只显示"暂无数据"。应给出：为什么为空、用户下一步能做什么、Primary Action、Secondary explanation。例如"还没有创建 API Key — API Key 用于外部系统访问你的工作空间 — Create API Key"。

## 十九、Loading

禁止整页只有一个巨大 Spinner。按组件使用：Skeleton、Table row skeleton、Chart placeholder、Button loading、Progressive loading。

## 二十、交互反馈

所有操作必须明确反馈：成功 Toast、失败 Error message + retry、危险 Confirmation、较复杂危险操作确认输入名称。后台操作不能"点了没反应"。

## 二十一、设计复杂功能时

先思考业务模式。例如权限系统不要设计成"权限名称 + Checkbox"列表，应设计 Role & Permission Management：Roles、Members、Resource、Actions、Permission matrix、Role inheritance、Search、Select all、Partial selection、Permission summary、Unsaved changes、Save state。

## 二十二、Design System / Component Library

不要自研基础 UI。优先基于成熟组件体系（Ant Design、shadcn/ui、Radix UI、Mantine、MUI、TanStack Table、React Hook Form、Recharts/ECharts 等），但**组件库只是基础设施，不是设计方案**。禁止直接使用默认样式拼页面。应建立项目自己的 Design Tokens、Typography、Spacing、Color、Radius、Shadow、Business Components、Interaction Patterns。

## 二十三、代码层组件架构

避免 `pages/Users.tsx` 一个文件几千行。推荐按 feature 组织：

```text
features/users/
  components/ hooks/ services/ types/ utils/
  users-table/ user-filters/ user-details/ bulk-actions/
components/
  DataTable/ FilterBar/ PageHeader/ EntityHeader/ MetricCard/
  StatusBadge/ EmptyState/ ErrorState/ ConfirmDialog/ DetailDrawer/ BulkActionBar/
```

不要复制相同 UI 到不同页面。

## 二十四、响应式原则

后台主要针对 Desktop，必须保证 1366×768、1440×900、1920×1080 正常使用。Tablet 允许 sidebar collapse；小屏幕优先保证数据和操作能力，而不是强行压缩所有内容。

## 二十五、每次重构页面时必须执行

写代码前先分析：Existing Problems → User Goal → Missing Capabilities → Information Architecture → Interaction Model → Business Components → Visual Hierarchy，然后才实现。

## 二十六、禁止行为

不要：只是换颜色/增加圆角/增加 shadow/修改 padding；把旧 Card 换成新 Card；完全沿用旧 DOM 或旧页面布局；一个 Card 承载复杂业务；一个 Modal 完成大型工作流；所有功能都做成 Modal；所有内容都使用 Card；大量图标装饰；大量渐变；每个页面一个巨大标题；每个区域都有说明文字；所有按钮都是主色；为了"高级感"浪费空间；写死大量重复组件；使用不一致的状态颜色；自研已有成熟组件库可解决的基础组件。

## 二十七、最终标准

判断页面是否合格，不看它是否"比原页面漂亮一点"，而看它是否：

1. 像一个真实商业产品；2. 用户知道当前在哪；3. 用户知道当前状态；4. 用户知道下一步能做什么；5. 高频任务足够快；6. 复杂任务有完整工作流；7. 异常情况有反馈；8. 无数据时有合理引导；9. 页面具备扩展能力；10. 相同模式已组件化；11. 充分利用现有成熟 UI 基础设施；12. 解决旧设计问题而不是继续继承；13. 在真实生产环境中真的可用。

如果答案是否定的：**继续重构，不要停止在"视觉优化完成"**。最终需要达到的不是 **Redesign the interface**，而是 **Redesign the product experience**。