# Community Go Admin — Production-grade 全栈产品重构

直接对当前项目进行系统性重构。

目标不是优化现有页面，也不是在现有 UI 骨架上增加组件，而是：

> **保留现有业务和 API 的兼容性，同时重新建立达到主流成熟项目水准的前端产品架构；当前后端能力不足以支撑成熟体验时，同步补充后端能力。**

不要把“兼容现有系统”理解成“沿用现有架构”。

如果当前 Layout、页面结构、组件体系、API 设计或交互模型存在明显问题，直接重构或替换。

---

## 1. 先推翻错误骨架

现有 UI 不作为新设计模板，只作为业务能力参考。

优先重建整个 App Shell：

```text
Viewport
├── Fixed Sidebar
└── Application Area
    ├── Fixed / Sticky Topbar
    └── Scrollable Main Workspace
```

要求：

* Sidebar 固定在 viewport，不随业务页面滚动。
* Sidebar 自己需要滚动时独立滚动。
* Main Workspace 独立滚动。
* 不允许整个 document 带着 Sidebar、Header、Footer 一起滚动。
* 移除现有全局“打开页面标签条”。
* 不再同时存在 Sidebar + Tab Bar + 多套二级导航。
* 删除固定 Footer 对工作区的占用。
* 禁止主工作区产生无意义水平滚动。
* 1440 / 1600 / 1920 宽度必须充分利用空间。

如果旧 Layout 无法满足以上要求，删除并重写，不要兼容错误 Layout。

---

## 2. 不要继续 Card-first

禁止继续使用：

```text
Page
└── Large Card
    └── One component
```

作为复杂功能的实现方式。

后台页面按照任务选择：

```text
Table
Tree
Split View
Inspector
Drawer
Modal
Matrix
Timeline
Log Explorer
Dashboard
Structured Form
```

Card 只承担局部分组，不承担页面骨架。

页面首先突出：

**数据、任务、状态和操作。**

容器最后才出现。

---

## 3. 基于当前组件栈，缺口用成熟技术补齐，不重复造基础 UI

**不替换当前组件栈。**

扫描当前前端技术栈并确认：

```text
Framework
Router
State / Query layer
UI component library
Form system
CSS / Design token 体系
```

当前项目已经有稳定组件库（HeroUI v3 + react-aria-components + Tailwind v4）作为基础 UI 层，重构继续基于它：

* 统一整个项目使用这套既有组件体系，不要更换或混用第二套视觉体系。
* 不要因为“想换新”就替换既有稳定组件库；替换只有在当前栈明确阻碍需求时才考虑。
* 不要同时混用多个视觉体系。

**需求优先，成熟技术补齐缺口：**

只有当新的或既有的需求在当前组件栈上无法合理满足时，才按需求评估并引入对应的成熟技术：

```text
当前栈无法满足的新控件 / 复杂交互
→ 优先评估成熟第三方库（受维护、有生态、许可证明确）
→ 仅在确实没有成熟方案时才考虑自研
```

基础组件不要自行重复实现（当前栈已覆盖的 UI 原语直接复用）：

```text
Button
Input
Select
Checkbox
Switch
Dropdown
Popover
Tooltip
Dialog
Drawer
Tabs
Table
Date Picker
Tree
Pagination
Form Control
```

自研代码应该主要用于：

**业务复合组件和产品交互。**

新增技术选型时遵守仓库技术选型基线：以成熟、受维护、有生产采用的第三方为优先，禁止无理由自研基础能力。

---

## 4. 建立三层组件架构

基础层：

```text
Design System / Library Primitives
```

产品层：

```text
AppShell
PageHeader
FilterBar
DataTable
DetailDrawer
SplitPane
CommandPalette
StatusBadge
EmptyState
ErrorState
DangerDialog
```

业务层：

```text
UserDirectory
UserDetail
RolePermissionEditor
SessionManager
AuditExplorer
OrganizationTreeManager
NavigationEditor
TokenManager
RuntimeOverview
```

Page 本身只负责：

```text
Route
Data orchestration
Feature composition
```

不要让业务逻辑和大量 UI 直接堆在 Page 文件中。

---

## 5. 一个复杂功能必须设计成完整 Feature

不要再使用“一两个组件就完成复杂业务”。

例如 User Management 应成为：

```text
UserManagement
├── UserToolbar
│   ├── Search
│   ├── Status Filter
│   ├── Role Filter
│   └── Create User
├── UserDataGrid
├── UserDetailDrawer
├── UserCreateDrawer
└── BulkActionBar（后端支持时）
```

Role Management 应成为：

```text
RoleManagement
├── RoleList
└── RolePermissionEditor
    ├── RoleSummary
    ├── PermissionSearch
    ├── PermissionMatrix
    ├── ChangeDiff
    └── StickySaveBar
```

Audit 应成为：

```text
AuditExplorer
├── QueryBar
├── FilterBar
├── EventTable
└── EventDetailDrawer
```

Menu Management 应成为：

```text
NavigationEditor
├── NavigationTree
├── NodeInspector
├── NavigationPreview
└── Save / Change State
```

Organization 应优先采用：

```text
OrganizationTree
+
Detail Inspector
```

而不是“创建表单 + 空白列表 Card”。

所有其他复杂模块按照相同原则进行产品化拆分。

---

## 6. Backend Compatibility 不等于 Backend Freeze

现有 API 必须保持兼容。

但成熟前端确实需要而 Backend 缺失的能力，应直接补齐 Backend。

例如根据实际业务需要增加：

```text
server-side search
pagination
filter
sorting
entity detail
batch operations
counts / aggregates
tree operations
reorder
detail metadata
```

仅在真正有产品价值时增加。

不要因为当前 Backend 没有接口，就把成熟前端降级成静态 Card。

同时不要制造假数据或假操作。

所有新增前端操作必须真实完成后端闭环。

---

## 7. 重新建立统一视觉系统

整体视觉定位：

**Linear × Cloudflare × GitHub Administration 风格方向**

不是复制，而是采用其：

**克制、专业、工程化、高信息密度、清晰层级。**

统一原则：

```text
Sidebar       232–248px
Topbar        52–56px
Page padding  24–32px
Input         36–40px
Button        32–36px
Table row     40–48px
Body text     14px
Radius        6–10px
```

大量使用：

```text
neutral background
1px border
clear typography hierarchy
subtle selected state
limited shadow
```

减少：

```text
巨大圆角
巨大白 Card
大面积留白
彩色 KPI Block
装饰性 Shadow
```

Blue 主要用于：

```text
Primary Action
Link
Selection
Focus
```

不要让整个产品“到处都是蓝色胶囊”。

---

## 8. 页面必须像成熟后台，而不是 API Viewer

不要直接暴露：

```text
raw UUID
raw ISO timestamp
i18n key
permission code
backend placeholder
{page}
{total}
undefined
null
```

给普通管理界面。

技术数据需要时使用：

```text
human-readable value
+
secondary technical metadata
```

例如：

```text
2026-08-27 18:31
2 minutes ago
```

而不是直接把完整 ISO 时间戳塞进输入框形状的容器。

Permission 显示：

```text
修改个人资料
iam.account.self.profile.write
```

而不是只显示机器字符串。

---

## 9. Settings 单独重构

Settings 是一个独立产品区域。

采用：

```text
Settings
├── Local Navigation
└── Settings Content
```

表单有效宽度控制在约：

```text
640–760px
```

不要让单个姓名、昵称输入框横跨整个屏幕。

Appearance 页面需要真实的设置层级和 Preview，而不是把 Switch、Select 随意铺在大 Card 中。

---

## 10. 数据页面统一使用成熟 Data Management Pattern

Users、Roles、Sessions、Tokens、Audit 等统一拥有成熟的数据页面语言：

```text
Page Header
Toolbar
Search / Filter
Data View
Pagination
Detail
Action Feedback
```

必须区分：

```text
Loading
Empty
No Results
Error
Permission Denied
Read-only
Saving
Success
Failure
```

不要只完成“正常数据存在时”的一个界面。

---

## 11. 必须修掉当前截图中体现出的架构问题

重构完成后不能再出现：

* Sidebar 跟随页面滚动。
* 页面底部固定无意义 Footer。
* 顶部堆十几个页面 Tab。
* Settings 同时出现两套重复导航。
* 页面出现整页水平滚动。
* Inspector 被挤出 viewport。
* 一个输入框横跨整个主区域。
* 一个复杂功能只由 Card + Button + Table 拼成。
* 空白 Card 占据大量空间。
* Raw i18n key 暴露给用户。
* Raw backend placeholder 暴露给用户。
* UUID、时间戳未经格式化占据主要视觉空间。
* 页面之间间距、字号、按钮、圆角、表格行为各不相同。

这些不是 polish 问题，属于必须修复的 architecture defect。

---

## 11b. 修复样式污染，重建统一样式权威

当前实现存在系统性样式污染（已按代码核实）：

* 模块 `*.module.css` 大量使用 `:global(...)` 选择器定义**平台级通用语义类**（如 `.permission-matrix`、`.role-checklist`、`.form-error`、`.session-row` 等），把本应属于统一样式层的类泄漏为全局样式。
* 同一语义出现**命名分裂**：平台用 kebab-case（`page-meta`、`filter-bar`），模块出现 camelCase/近似变体（`pageMeta`、`formHint`、`shellSearchTrigger`、`footerStatus`），多份定义并存，行为随模块而异。
* 平台类在模块内被**私有覆盖**（如移动断点下 `.toolbar` 在模块 media query 里被改写），平台升级或新增需求时模块页面表现不一致，交互被破坏。
* 新增需求后交互出问题的根因之一：模块样式与平台样式之间没有单一归属，改动互相渗透。

重构对此建立硬性样式架构：

1. **单一样式权威**：所有平台级语义类只存在于统一样式层（`styles.css` 及其 token/原语），模块不得用 `:global` 重新定义平台类。
2. **模块样式只允许模块专属 selector**：必须使用 CSS Modules 作用域（`module.css` 的局部类），业务专用类经模块局部作用域引用，禁止 `:global` 泄漏到全局。
3. **命名唯一**：同一语义全局只有一个类名（平台统一 kebab-case），消灭 camelCase 变体。
4. **禁止私有覆盖平台类**：模块不得在自身样式或媒体查询中改写平台布局类；响应式行为由平台统一提供。
5. **验收**：重构后 `lint:architecture` 全面执行——平台类在模块样式中的重复定义/`:global` 泄漏/私有覆盖均不得通过；新增页面样式必须落到平台原语或模块局部类。

---

## 11c. 重写布局骨架，修复滚动与视口缺陷

当前布局骨架存在机制性缺陷（已按代码核实）：

* **主区域用 `height: 100vh` 固定**（`styles.css .app-workspace`）：移动端浏览器地址栏伸缩时底部被截断或留白，Inspector/操作区易被挤出 viewport；应使用 `100dvh` 或视口单位组合。
* **页面内容被压进居中容器**（`.page-viewport` `max-width:1600px + margin:0 auto`）：1440/1600/1920 宽度下两侧大量留白，没有按方案要求充分使用横向空间。
* **滚动发生在内容容器内而非独立 Main Workspace**：`.page-viewport` 自身 `overflow:auto`，与「Fixed Sidebar + 独立滚动 Main Workspace」的骨架目标不一致；Sidebar 用 grid 列 + `min-height:100vh`，非真正固定在 viewport。
* **全局 Tab Bar 仍在**（`WorkspaceTabs` 顶部页签），与「移除全局打开页面标签条」冲突。
* 响应式与页面内容宽度由内容容器统一承担，缺少按场景（Table 全宽 / Settings 收窄 / Detail 中宽）的宽度档。

重构对布局骨架建立硬性要求（对应方案第 1 节）：

1. Sidebar 固定在 viewport（独立可滚动），不随页面内容滚动。
2. 主工作区独立滚动；document/body 不承担页面滚动。
3. 视口高度用 `100dvh`（兼容移动端动态视口），不得使用 `100vh` 固定导致底部截断。
4. 横向空间按场景充分使用：Table/Dashboard 全宽，Settings 640–960px，Detail 中宽；取消“一切压中央 max-width 容器”的唯一路径。
5. 移除全局打开页面标签条；只保留主导航 + 面包屑 + 浏览器历史。
6. 禁止主工作区无意义水平滚动（表格横向滚动窗按列语义处理）。

---

## 11d. 后台产品设计风格基准（Design Baseline）

> 完整权威文档见 [admin-design-baseline.md](admin-design-baseline.md)，本节提炼为核心要求。重构执行时每个页面/组件设计前必须对照本基准。

**定位**：Modern Enterprise Admin Console；视觉关键词 Professional / Clean / Dense / Structured / Data-first / Functional / Modern / Enterprise / SaaS。避免廉价管理后台、默认组件库样式、大量蓝色按钮、到处都是 Card、大圆角、玻璃拟态、大面积阴影、低信息密度模板页。

**产品化原则**：
- 不要把现有页面骨架当约束：页面设计从 User Goal → Workflow → IA → Functional Components → UI Components 推导，不按后端接口数决定前端复杂度；旧页面结构不合理直接推翻重设计。
- 禁止"原子组件堆砌"：高级筛选是 FilterBar/Query Builder（搜索/条件/快速筛选/Active filters/Saved views/Reset/count/expand），数据分析是 MetricCard（label/value/trend/delta/time range/mini chart/drill-down），不是 Input+Select+Button 或 Card+Number。
- 复杂功能必须是完整 Feature（用户管理工作区/权限矩阵/审计 Explorer），不是一两个组件。

**业务组件库**（复用而非堆叠）：DataTable（列配置/排序/过滤/选择/批量/列可见性/密度/Sticky/行操作/空载错态/导出/刷新）、FilterBar、EntityHeader、MetricCard、StatusBadge（统一状态色，禁止页面自定）、ActivityTimeline、DetailDrawer（按上下文选 Drawer/Modal/Panel/Page）、BulkActionBar（勾选后出现，非常驻顶部）。

**页面模板体系**：Dashboard（Context Header+KPI+Trend+Alerts+Overview+Activity）、List Workspace（Header+Tabs+Toolbar+Saved Views+FilterBar+DataTable+Bulk+Detail）、Detail Page（Breadcrumb+Entity Header+Status+Actions+Summary+Tabs+Activity+Audit）、Configuration（左侧 Settings Nav + 右侧配置区，按 General/Security/Notifications/Integration/Permissions/Advanced）、Analytics（Date Range+Dimensions+KPI+Trend+Breakdown+Table+Insight+Export）。

**布局与视觉**：
- Sidebar 固定（sticky/fixed app shell，独立滚动）240px expanded / 64–72px collapsed；Topbar 56–64px 紧凑（Breadcrumb/全局搜索/命令/通知/Help/User）；页面标题在 Page Header。
- Content 不机械限宽：数据页/表格可全宽，Dashboard 可限阅读宽度；8px spacing（4/8/12/16/20/24/32/40/48），section 间距 24–32px。
- 圆角：Button/Input 6–8、Card 8–10、Modal 10–12；阴影只用于 Popover/Dropdown/Modal/Floating/Command palette。
- 色板：bg `#F6F7F9`、surface `#FFF`、text `#111827`/`#6B7280`/`#9CA3AF`、border `#E5E7EB`、primary `#4F46E5` 或 `#2563EB`、success `#16A34A`、warning `#D97706`、danger `#DC2626`、info `#0284C7`；Blue 只用于 Primary Action/Link/Selection/Focus。
- 字体层级：Page 24–28/600、Section 16–18/600、Card 14–16/600、Body 14、Secondary/Table 13–14、Label 12–13、Metadata 12。

**Table 是核心工作区**：具备产品级能力（sticky/sort/filter/search/pagination/selection/row action/列配置/密度/状态/loading/empty/error/bulk/hover/overflow）；操作列主要操作显示 1 个，其余收进 `...`，危险操作放末尾分隔。

**状态与反馈**：所有页面考虑 Default/Hover/Focus/Active/Selected/Disabled/Loading/Empty/Error/Success/Permission denied；Empty State 给"为什么空/能做什么/动作"；Loading 用 Skeleton/Table skeleton/Button loading 而非整页 Spinner；操作必须有反馈（成功 Toast/失败+retry/危险确认/复杂危险确认输入名称）。

**代码架构**：按 feature 组织（`features/users/{components,hooks,services,types,utils,users-table,user-filters,user-details,bulk-actions}`），全局业务组件单独目录；禁止 `pages/Users.tsx` 千行单文件。

**响应式**：保证 1366×768、1440×900、1920×1080 正常使用；Tablet 允许 sidebar collapse；小屏优先数据与操作能力。

**每次重构页面前执行**：已有问题 → 用户目标 → 缺失能力 → IA → 交互模型 → 业务组件 → 视觉层级，然后实现。

**最终标准**：不像"比原页面漂亮"，而像真实商业产品（用户知道在哪/状态/下一步、高频任务快、复杂任务有工作流、异常有反馈、空态有引导、模式已组件化、充分利用成熟 UI 基础设施、解决旧设计问题、生产可用）。不达标继续重构，目标是 **Redesign the product experience** 而非 Redesign the interface。

---

## 12. 工作方式

先扫描代码，再直接实施。

顺序：

```text
Audit existing architecture
↓
Confirm current stack / fill gaps with mature libs
↓
Replace App Shell
↓
Build design tokens
↓
Build shared product components
↓
Build domain feature components
↓
Extend backend where mature workflows require it
↓
Migrate all modules
↓
Visual / interaction / responsive QA
```

不要先逐页面修 CSS。

不要为了“少改代码”保留错误架构。

不要输出一份长设计说明然后停止。

直接修改真实项目。

---

# 最终验收标准

完成后必须达到：

> 即使隐藏 Community Go Logo，用户仍然能一眼判断这是一个成熟、专业、统一的 Administration Console，而不是 CRUD Demo 或 Backend Management UI。

同时满足：

```text
Existing backend compatibility
+
Required backend enhancement
+
Mature frontend capability
+
Unified component architecture
+
Unified visual system
+
Production-level usability
```

如果某个现有页面只是变得“更漂亮”，但骨架、工作流和组件组合方式基本没变：

**视为没有完成重构，继续重做。**
