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

## 3. 使用成熟组件库，不重复造基础 UI

扫描当前前端技术栈。

选择一个与当前 Framework 匹配的成熟组件体系作为基础 UI 层，并统一整个项目。

React 优先评估成熟 Enterprise 组件体系，例如 Ant Design / Arco Design；如果现有项目已经有稳定组件库，优先统一使用现有库。

Vue 使用对应成熟 Vue Enterprise Component Library。

不要同时混用多个视觉体系。

基础组件不要自行重复实现：

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

## 12. 工作方式

先扫描代码，再直接实施。

顺序：

```text
Audit existing architecture
↓
Choose / unify component library
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
