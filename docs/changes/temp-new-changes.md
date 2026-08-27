# Community Go Admin WebUI — Product Architecture & UI System Reconstruction

你正在直接操作一个已经拥有真实后端能力、真实 API、权限系统、业务模型和现有前端代码的 Administration Web Application。

本次任务不是进行 UI 美化，也不是修改若干页面。

本次任务是：

> **基于现有真实后端能力，重新建立 Community Go 的完整前端产品架构、信息架构、交互体系、页面骨架、设计系统和品牌 UI，并实际完成代码级系统性重构。**

将当前系统视为：

```text
Backend Capability
+
Basic Routing
+
UI Component Mapping
```

目标是将其重建为：

```text
Backend Capability
        ↓
Frontend Product Capability
        ↓
User Workflow
        ↓
Information Architecture
        ↓
Interaction Model
        ↓
Page Architecture
        ↓
Design System
        ↓
Reusable Components
        ↓
Production Admin Console
```

最终产品必须成为真正意义上的：

**Enterprise Administration Console / Developer Control Plane**

而不是：

**Backend API Visualization / UI Component Showcase / CRUD Demo**

---

# 01. 不要直接修改页面，首先理解整个产品

开始任何 UI 编码之前，首先扫描整个代码仓库。

识别并整理：

* Application Routes
* Navigation
* Authentication
* Authorization
* Permission definitions
* Roles
* Users
* Sessions
* API Tokens
* Organizations
* Departments
* Positions
* Menus
* Audit Logs
* Management APIs
* Runtime APIs
* Diagnostics
* Metrics
* Probe / Health
* Settings
* Profile
* Security
* Notifications
* Appearance
* Language
* API Documentation
* 所有其他真实存在的业务模块

同时识别：

* API Client
* Data fetching architecture
* State management
* Form architecture
* Component system
* Current CSS / Theme / Token architecture
* Responsive architecture
* Existing frontend framework
* Existing UI framework
* Existing permission guards
* Existing error handling
* Existing routing conventions

不要假设业务。

不要根据 UI 猜测 Backend Capability。

以：

**真实代码 + 真实 API + 真实数据模型**

作为唯一功能事实来源。

---

# 02. 建立 Capability Map

扫描完成后，在内部建立：

```text
BACKEND CAPABILITY MAP
```

每一个后端能力必须转换为：

```text
Backend Capability
↓
User Goal
↓
User Task
↓
Workflow
↓
UI Pattern
↓
Page / Drawer / Modal / Table / Detail
```

例如不要采用：

```text
createUser API
=
一个创建用户输入框
```

而应该建立：

```text
User Management

Discover user
Search user
Filter user
Inspect user
Create user
Edit user
Manage role
Manage security
Inspect session
Inspect activity
```

同样：

```text
permission:list
```

不等于：

```text
显示 Permission Badge
```

它应该成为：

```text
Permission Catalog
Permission Search
Permission Group
Permission Detail
Permission Role Usage
Permission Matrix
```

前提是对应数据确实存在。

---

# 03. 后端能力不等于前端页面

禁止采用：

```text
1 API endpoint = 1 screen
```

禁止采用：

```text
1 backend model = 1 page
```

页面必须按照：

**User Task**

而不是：

**Backend Object**

进行组织。

可以：

* 合并当前页面
* 删除没有产品意义的页面
* 将页面改成 Drawer
* 将表单改成 Wizard
* 将信息改成 Table
* 将实体改成 Master Detail
* 将多个后端能力组合成一个完整工作流

只要不改变真实业务语义。

---

# 04. 产品定位

Community Go Admin 定位为：

> 面向管理员、开发者、系统维护者和组织管理者使用的现代化 Administration Control Plane。

整体品牌气质：

```text
Professional
Technical
Precise
Calm
Operational
Trustworthy
Structured
Efficient
Dense but Readable
Developer Friendly
Enterprise Ready
```

不要设计成：

```text
Consumer App
Marketing Website
Low-code Builder
Template Dashboard
Component Showcase
Dribbble Dashboard
AI SaaS Landing Page
```

视觉和交互可以学习现代：

```text
GitHub
Cloudflare
Stripe
Linear
Vercel
Grafana
Datadog
Atlassian Administration
Modern Cloud Consoles
```

中的：

* 信息密度
* 数据层级
* Navigation Discipline
* Operational UX
* Developer UX
* Table UX
* Detail UX
* Command UX

禁止直接复制任何产品。

---

# 05. 删除“Component-first Design”

不要按照：

```text
需要显示信息
↓
找一个 Card
```

进行设计。

新的基本原则是：

```text
Task First
Data First
Workflow First
State First
Component Last
```

视觉优先级必须是：

```text
User Task
↓
Important Data
↓
System Status
↓
Primary Action
↓
Secondary Information
↓
Container
```

而不是：

```text
Card
↓
Border
↓
Shadow
↓
Heading
↓
Data
```

---

# 06. Card 不再作为主要页面骨架

禁止把整个后台设计成 Card Collection。

Card 只用于：

```text
Small grouped information
KPI
Summary
Contextual information
Independent module
```

后台主要内容优先使用：

```text
Table
List
Tree
Matrix
Timeline
Chart
Inspector
Split View
Detail Panel
Drawer
Log Explorer
Structured Form
```

减少：

```text
Card inside Card
Section inside Card
Card inside Section
```

形成的白盒嵌套。

Container 不应该比内容更突出。

---

# 07. 重新建立 Information Architecture

重新评估整个系统功能，并建立稳定 IA。

可使用类似：

```text
Overview

Operations
  Runtime
  Health
  Diagnostics

Identity & Access
  Users
  Roles
  Permissions
  Sessions
  API Tokens

Organization
  Organization
  Departments
  Positions

Governance
  Audit Logs
  Navigation / Menu Management

Settings
  Profile
  Account
  Security
  Notifications
  Appearance
  Language

Developer
  API Documentation
```

这只是结构模型。

最终 IA 必须根据真实项目代码调整。

不要为了匹配以上结构创造不存在的功能。

---

# 08. 一个系统只能有一套主导航逻辑

消除多个导航系统互相竞争的问题。

不要同时长期存在：

```text
Sidebar
+
Global page tabs
+
Secondary sidebar
+
Breadcrumb
```

需要建立：

```text
Global Navigation
↓
Section
↓
Page
↓
Entity Detail
```

Breadcrumb 用于表达当前位置。

Local Navigation 只允许出现在拥有明确子结构的模块，例如 Settings。

---

# 09. 移除无业务意义的 Global Page Tab Strip

不要把后台应用设计成浏览器。

不要因为用户进入过：

```text
Users
Runtime
Profile
Permissions
Tokens
```

就在顶部不断生成 Tab。

只有当真实业务存在：

```text
Multi-document workspace
Multi-instance workspace
Multi-console workspace
```

时才允许设计 persistent workspace tabs。

否则使用：

```text
Navigation
Breadcrumb
Browser history
Deep link
```

完成页面移动。

---

# 10. App Shell

重新设计统一 App Shell。

结构：

```text
┌──────────────────────────────────────────┐
│ Sidebar │ Top Context Bar                │
│         ├────────────────────────────────│
│         │ Main Workspace                 │
│         │                                │
│         │                                │
└──────────────────────────────────────────┘
```

---

# 11. Sidebar Architecture

Desktop Expanded：

```text
232–248px
```

Collapsed：

```text
64–72px
```

Sidebar 内容结构：

```text
Brand

Primary Navigation

Navigation Groups

Secondary Sections

Flexible Spacer

System / Help

User
```

可以使用 Group Label：

```text
OPERATIONS

IDENTITY & ACCESS

ORGANIZATION

GOVERNANCE
```

不要让所有项目拥有相同视觉重量。

---

# 12. Navigation Active State

Active Item 不使用巨大胶囊按钮。

使用：

* subtle background
* brand accent
* stronger text
* clear icon
* optional left indicator

Selected state 必须：

**明显但克制。**

Hover、Selected、Focus、Disabled 必须明确区分。

---

# 13. Top Context Bar

Topbar 推荐：

```text
52–60px
```

职责：

左侧：

```text
Breadcrumb
Current context
Optional environment
```

右侧：

```text
Command Search
System Status
Help
Theme
User Menu
```

不要在 Topbar 堆大量产品功能。

---

# 14. Page Anatomy

所有页面统一使用：

```text
Page
│
├─ Page Header
│  ├─ Eyebrow optional
│  ├─ Title
│  ├─ Description
│  └─ Actions
│
├─ Toolbar optional
│  ├─ Search
│  ├─ Filters
│  ├─ Sort
│  ├─ View
│  └─ Secondary actions
│
├─ Content
│
└─ Pagination / Context Footer optional
```

不允许每个页面重新发明 Layout。

---

# 15. 页面最大宽度不采用统一 Website Container

这是 Administration Console。

不同页面应该拥有不同内容宽度：

```text
Table
Full workspace

Dashboard
Full workspace

Master Detail
Full workspace

Settings
720–960px

Simple form
600–760px

Entity Detail
800–1200px
```

不要将所有页面压在中央 1000px 容器中。

---

# 16. Responsive Grid

Desktop 使用：

```text
Fluid 12-column Grid
```

优先设计：

```text
1440
1600
1920
2560
```

桌面后台必须有效利用横向空间。

Tablet：

* collapsed navigation
* adaptive columns

Mobile：

* drawer navigation
* stacked forms
* horizontal table handling

不要为了 Mobile 牺牲 Desktop Admin 的信息效率。

---

# 17. 建立新的 Design Token Architecture

所有基础 UI 必须由 Token 驱动。

建立：

```text
color.*
surface.*
text.*
border.*
space.*
radius.*
font.*
shadow.*
motion.*
zIndex.*
control.*
```

禁止出现大量页面级：

```text
#3978ff
18px
22px
13px radius
random shadow
random padding
```

---

# 18. Color System

品牌色继续采用专业 Blue 系。

Brand Blue 只用于：

```text
Primary CTA
Selected State
Links
Focus
Important interaction
```

不要把整个应用染蓝。

建立 Neutral System：

```text
Canvas
Surface
Surface Elevated
Surface Muted

Border
Border Strong

Text Primary
Text Secondary
Text Muted

Brand
Info
Success
Warning
Danger
```

---

# 19. Semantic Color

颜色代表意义而不是装饰。

```text
Green = Healthy / Success
Yellow = Warning
Red = Error / Destructive
Blue = Interaction / Information
Gray = Neutral / Inactive
```

不要为了视觉丰富而使用多个高饱和 KPI Card。

Dashboard 应该首先专业，其次才是视觉丰富。

---

# 20. Typography

建立完整 Typography Scale。

例如：

```text
Page title        24–28
Section heading   16–18
Body              14
Secondary         13
Metadata          12
Code              12–13
```

中文系统字体：

```text
system-ui
PingFang SC
Microsoft YaHei
Noto Sans CJK SC
```

英文：

```text
Inter
system-ui
```

技术字段：

```text
ui-monospace
SFMono
JetBrains Mono
```

---

# 21. Code / Developer Metadata

以下字段使用 monospace：

```text
Permission ID
API Scope
Token ID
Commit
Version
IP
Resource ID
Trace ID
Session ID
Technical Identifier
```

技术字符串应该作为：

**metadata**

而不是页面主要视觉元素。

---

# 22. Radius

整体保持工程化、克制。

推荐：

```text
Small control      6px
Control            8px
Panel              8–10px
Dialog             12px
```

避免：

```text
20px
24px
30px
```

的大圆角成为整个系统主要视觉特征。

---

# 23. Border & Shadow

后台主要依赖：

```text
Surface
Border
Spacing
Typography
```

建立层级。

不要依赖大量 Shadow。

普通 Panel：

```text
1px subtle border
```

Shadow 主要用于：

```text
Popover
Dropdown
Drawer
Dialog
Floating UI
```

---

# 24. Spacing Density

系统采用中高信息密度。

建议建立：

```text
4px base spacing system
```

例如：

```text
4
8
12
16
20
24
32
40
48
```

桌面页面 Padding：

```text
24–32px
```

不要出现大量 48–80px 无业务意义留白。

---

# 25. Control Density

Admin Control 建议：

```text
Input height
36–40px

Button height
32–36px

Table row
40–48px

Compact table
36–40px
```

避免消费端式巨大输入框和按钮。

---

# 26. Button Hierarchy

每一个页面最多一个明显 Primary Action。

层次：

```text
Primary
Secondary
Tertiary
Ghost
Danger
```

例如：

```text
Create User = Primary

Export = Secondary

Refresh = Ghost

Delete = Danger
```

不要出现多个同权重蓝色按钮。

---

# 27. Data Table 成为核心基础设施

创建统一 Production DataTable。

根据业务需求支持：

```text
Search
Filter
Sort
Pagination
Selection
Batch operation
Column visibility
Sticky header
Row menu
Density
Empty state
Loading state
Error state
```

不要强制每一个 Table 使用全部功能。

按实际任务启用。

---

# 28. Search & Filter Architecture

列表页 Toolbar 使用统一模型：

```text
Search
Primary filters
Advanced filters
Clear filters
Result count
```

Filter State 应尽可能同步 URL。

例如：

```text
/users?status=active&role=admin&page=2
```

这样：

* Refresh 不丢失上下文
* URL 可分享
* Browser back 正常工作

---

# 29. Master–Detail Pattern

以下类型优先考虑：

```text
List / Table
+
Detail Drawer
```

例如：

```text
User
Role
Permission
Token
Session
Audit Event
Dependency
```

用户点击 Row 后打开 Detail Drawer。

这样保留列表上下文。

核心实体同时支持 Deep Link。

---

# 30. Drawer System

建立标准 Drawer：

```text
Header
Title
Metadata
Actions

Tabs optional

Content

Footer optional
```

宽度按场景：

```text
480
560
640
720
```

不要所有 Detail 都打开新的完整页面。

---

# 31. Modal 使用边界

Modal 仅用于：

```text
Confirmation
Short form
Destructive action
Focused decision
```

复杂工作流使用：

```text
Drawer
Dedicated page
Wizard
```

不要把复杂表单塞入 Modal。

---

# 32. Form Architecture

统一：

```text
Label
Description optional
Control
Helper
Error
```

Placeholder 不替代 Label。

Settings / Forms 不应该无限横向拉伸。

Field Width 根据数据本身定义。

例如：

```text
Name
320–480px

Description
480–640px

Date
240px
```

---

# 33. Settings Architecture

所有个人设置收敛到统一：

```text
Settings
```

Settings 内部 Local Navigation：

```text
Profile
Account
Security
Notifications
Appearance
Language
```

不要把 Profile、Account、Appearance 等作为大量全局 Sidebar 一级入口。

---

# 34. User Management 必须产品化

User Management 以：

```text
Directory
```

作为核心。

主视图：

```text
Users                               Create User

Search users
Status
Role
Organization
More filters
```

Table 至少根据真实数据选择：

```text
User
Display Name
Role
Status
Last Activity
Created At
Actions
```

不要用巨大 Card 创建 User。

Create User 应使用：

```text
Drawer
```

或独立流程。

---

# 35. User Detail

User Detail 应根据真实 Backend Capability 组织：

```text
Overview
Roles
Sessions
Security
Activity
```

如果某项能力不存在：

不要伪造。

---

# 36. Role Management

Roles 使用 List / Table。

例如：

```text
Role
Description
Members
Permissions
Updated
```

Role Detail：

```text
Overview
Members
Permissions
```

---

# 37. Permission UX

Permission 不要设计成几十个 Badge。

Permission Catalog：

```text
Search

Permission
Domain
Action
Description
Used by Roles
```

技术 ID：

```text
iam.account.self.password.write
```

使用 monospace secondary text。

---

# 38. Permission Matrix

分配权限时优先使用：

```text
Grouped Permission Matrix
```

例如：

```text
Resource          Read   Create   Update   Delete

Account            ✓       —        ✓        —
Role               ✓       —        ✓        —
Organization       ✓       ✓        ✓        ✓
```

如果现有权限模型不是 CRUD：

按照真实 Permission Taxonomy 生成对应 Matrix。

不要硬套 CRUD。

---

# 39. API Token Management

API Token 创建不使用：

```text
长表单
+
几十个 checkbox
```

设计为：

```text
Token Creation
```

Workflow：

```text
Identity
↓
Expiration
↓
Scopes
↓
Review
↓
Create
↓
Reveal Secret
```

---

# 40. Scope Selection

Scopes 按 Domain 分组。

例如：

```text
Account
IAM
Organization
Navigation
Audit
API
```

支持合理的：

```text
Search scope
Read-only preset
Domain selection
Clear
```

只在真实 Scope 模型允许时实现。

---

# 41. Token Secret

Secret 创建成功：

只展示一次。

页面明确表达：

```text
This token will only be shown once.
```

提供：

```text
Copy
```

不要再次从 Backend 假装能够读取 Secret。

---

# 42. Token List

Token 列表应包含真实支持字段，例如：

```text
Name
Status
Scopes
Created
Expires
Last Used
```

Actions 根据 Backend：

```text
Disable
Rotate
Expire
Revoke
```

不支持的功能不要出现。

---

# 43. Runtime 必须重构成 Operations Experience

不要设计成：

```text
一个 Metric
=
一张彩色 Card
```

建立：

```text
Operations Overview
```

顶部 Context：

```text
Environment
Health
Version
Uptime
Last Refresh
Refresh
Time Range
```

根据 Backend Capability 显示。

---

# 44. Operations Information Hierarchy

第一层：

```text
Overall Health
Requests
Errors
Latency
Dependency Health
```

第二层：

```text
Traffic / Request Trend
Latency Trend
CPU
Memory
```

第三层：

```text
Dependencies
```

第四层：

```text
Instances / Runtime
```

第五层：

```text
Host Resources
```

这是信息架构模型。

只实现真实有数据的部分。

---

# 45. 绝不伪造监控数据

如果 Backend 只有 Snapshot：

显示：

```text
Live Snapshot
```

而不是假折线图。

如果没有 Historical Metrics：

显示：

```text
Historical metrics are not available.
```

如果 Disk Metrics 未接：

显示：

```text
Disk metrics not configured
```

不要显示：

```text
Unavailable
```

大红色错误 Card，除非磁盘真的发生故障。

---

# 46. 区分 Error 与 Missing Integration

必须区分：

```text
Failure
Unavailable
Unsupported
Not configured
No data
No history
Permission denied
```

这些不是同一个状态。

建立正确 Semantic State。

---

# 47. Organization Management

根据真实数据关系，优先评估：

```text
Tree
+
Detail
```

模式。

例如：

```text
Organization

 ├ Engineering
 │   ├ Frontend
 │   └ Backend
 └ Operations
```

右侧展示：

```text
Name
Parent
Members
Positions
Metadata
```

只有 Backend 支持时才允许：

```text
Move
Reorder
Drag
Archive
```

---

# 48. Audit Log

Audit Log 设计成：

**Log Explorer**

而不是普通 Card。

顶部：

```text
Search
Actor
Action
Resource
Result
Date Range
```

Table：

```text
Timestamp
Actor
Action
Resource
Result
IP
```

点击打开：

```text
Audit Event Detail
```

---

# 49. Audit Detail

展示：

```text
Event ID
Timestamp
Actor
Action
Resource
Result
Request metadata
Related metadata
```

JSON / Metadata 使用代码展示模式。

不要把 JSON 做成普通 Paragraph。

---

# 50. Menu / Navigation Management

如果系统支持 Menu Management：

使用：

```text
Navigation Tree
+
Configuration Inspector
```

而不是一系列普通输入框。

结构：

```text
Tree

Item Detail
  Label
  Route
  Icon
  Permission
  Visibility
  Parent
  Order
```

只有真实支持 reorder 时才允许 Drag & Drop。

---

# 51. Command Search

顶部全局搜索必须具有实际意义。

优先实现：

```text
Page Navigation
```

如架构允许，再支持：

```text
Users
Roles
Settings
Resources
```

快捷键：

```text
Ctrl + K
Cmd + K
```

不要保留一个无法操作的 Search UI。

---

# 52. Empty State

所有数据页面建立真实 Empty State。

结构：

```text
What happened
Why
What can be done
Action
```

例如：

```text
No API tokens

Create a token to authenticate automated clients.

Create Token
```

不要只写：

```text
暂无数据
```

---

# 53. Loading

建立统一：

```text
Skeleton
Table Skeleton
Panel Skeleton
Inline Spinner
```

不要所有加载都使用全屏 Spinner。

Skeleton 应尽量匹配最终布局。

---

# 54. Error State

区分：

```text
Page Error
Section Error
Inline Error
Action Error
Permission Error
Connectivity Error
```

局部请求失败不要让整个应用崩溃。

---

# 55. Optimistic UX 谨慎使用

只有 Backend contract 和失败恢复足够明确时使用 Optimistic Update。

安全相关操作：

```text
Role
Permission
Token
Session
Delete
Revoke
```

优先等待真实 Backend 成功。

---

# 56. Feedback System

统一：

Toast：

```text
Created
Saved
Copied
Updated
```

Inline：

```text
Validation error
Field error
API field error
```

Banner：

```text
Global warning
System degradation
Permission limitation
```

Dialog：

```text
Confirmation
Destructive action
```

不要任何操作都弹 Toast。

---

# 57. Danger Zone

以下功能：

```text
Delete
Revoke
Disable
Reset
Archive
Rotate credentials
```

必须有完整危险操作设计。

包括：

```text
Consequence explanation
Confirmation
Optional identifier confirmation
Loading state
Failure recovery
Success feedback
```

不要只放一个红色 Button。

---

# 58. Status System

建立统一 Status Component。

状态包括：

```text
Active
Inactive
Enabled
Disabled
Pending
Healthy
Degraded
Failed
Expired
Revoked
```

Badge 只用于：

**状态和少量分类。**

不要把：

```text
ID
Permission Code
普通文本
Metadata
```

全部做成 Badge。

---

# 59. Interaction States

所有 Interactive Component 必须具备：

```text
Default
Hover
Focus
Active
Selected
Disabled
Loading
Error
```

Focus 必须清晰。

不能只针对 Mouse 用户设计。

---

# 60. Accessibility

至少满足：

```text
Keyboard Navigation
Visible Focus
Semantic HTML
ARIA labels
Dialog focus trap
Escape close
Table semantics
Form labels
Contrast
Reduced Motion
```

Icon-only button：

必须存在：

```text
Tooltip
aria-label
```

---

# 61. Motion System

动画：

```text
120–180ms
```

强调：

```text
Fast
Subtle
Functional
```

适合：

```text
Drawer
Popover
Dropdown
Selection
Collapse
```

禁止：

```text
Bounce
Large movement
Decorative page transitions
```

---

# 62. Brand Identity

Community Go 的品牌存在感来自：

```text
Typography
Color
Precision
Layout rhythm
Navigation
Interaction quality
Developer details
```

而不是：

```text
Large gradient
Decorative illustration
Big rounded cards
Excess branding
```

---

# 63. Brand Header

Sidebar Brand Area 保持简单：

```text
CG Mark

Community Go
Admin Console
```

或者根据现有品牌体系使用等价表达。

不要占据过多垂直空间。

---

# 64. Footer

不要在所有页面底部固定显示大型：

```text
Community Go Admin WebUI
2026
```

版本 / Build 信息移动至：

```text
Sidebar bottom
About
System Information
```

减少 Workspace 噪音。

---

# 65. 建立核心 Semantic Components

新的组件系统至少评估并建立：

```text
AppShell
Sidebar
Topbar
Breadcrumb
PageHeader
PageToolbar

DataTable
FilterBar
SearchInput
Pagination

StatusBadge
CodeText

EmptyState
ErrorState

DetailDrawer
ConfirmDialog
DangerZone

FormField
SettingsSection

MetricSummary
HealthIndicator

PermissionMatrix

TreeView
InspectorPanel

LogTable
CodeViewer
```

组件按照：

**业务语义**

创建。

不要建立大量：

```text
BlueCard
BigCard
SmallCard
RoundedContainer
```

这类视觉命名组件。

---

# 66. Design System 优先于 Page CSS

禁止：

```text
Page A
自己写 spacing

Page B
自己写 button

Page C
自己写 card

Page D
自己写 table
```

必须：

```text
Token
↓
Primitive
↓
Semantic Component
↓
Page Pattern
↓
Business Page
```

---

# 67. 不要无意义替换技术栈

首先理解现有：

```text
Framework
Router
State
UI library
CSS architecture
Form library
Query library
```

如果能够在当前技术体系上完成高质量重构：

继续使用。

只有现有基础设施明显阻碍：

```text
Design System
Accessibility
Maintainability
Performance
```

时才进行合理架构调整。

不要为了“现代化”重写整个技术栈。

---

# 68. 保留 Backend Contract

此次允许大幅重构：

```text
UI
UX
Layout
Route grouping
Frontend component architecture
Interaction model
```

但不要随意改变：

```text
Backend contract
Permission semantics
Security semantics
Business semantics
```

---

# 69. 禁止 Fake Frontend

绝对禁止创建后端不存在的假能力。

不要伪造：

```text
Charts
Activity
Location
History
Latency
Batch operation
Drag & Drop
Notifications
Insights
```

如果数据不存在：

```text
Omit
```

或：

```text
Explain unavailable capability
```

而不是 Mock。

---

# 70. 所有 Action 必须形成 Backend 闭环

以下按钮：

```text
Create
Edit
Save
Delete
Enable
Disable
Reset
Revoke
Rotate
Refresh
```

只要展示在 UI：

就必须真正调用 Backend。

禁止：

```text
Click
↓
Fake delay
↓
Success toast
```

这种假交互。

---

# 71. Permission-aware UI

所有操作必须考虑：

```text
Current user permissions
```

没有权限时根据业务选择：

```text
Hide
Disable
Read-only
Explain
```

不要让用户点击后才发现 403，除非无法提前判断。

---

# 72. URL State

关键状态尽可能 URL 化。

例如：

```text
/users?page=2&status=active
```

Detail：

```text
/users/:userId
```

或者：

```text
/users?selected=:userId
```

确保：

```text
Refresh
Back
Forward
Share
```

行为稳定。

---

# 73. 重新定义页面完成标准

任何页面只有同时满足以下条件才算完成：

```text
User understands location

User understands data

User understands status

User understands available actions

User understands result after action
```

页面必须快速回答：

```text
Where am I?

What is here?

What matters?

What can I do?

What happened?
```

---

# 74. 页面不是功能清单

不要因为 Backend 有：

```text
20 endpoints
```

就生成：

```text
20 pages
```

优先建立：

```text
5 complete workflows
```

而不是：

```text
20 incomplete screens
```

---

# 75. 代码实施顺序

严格按照以下 Phase 进行。

## PHASE 1 — Product Audit

输出内部：

```text
Route Map

Backend Capability Map

Frontend Capability Map

Permission Map

Entity Relationship Map

Existing UI Architecture
```

---

## PHASE 2 — Product Architecture

定义：

```text
Information Architecture

Navigation Architecture

Entity Architecture

Workflow Architecture
```

---

## PHASE 3 — Design Foundation

建立：

```text
Design Tokens

Color

Typography

Spacing

Radius

Border

Shadow

Motion

Accessibility
```

---

## PHASE 4 — Application Shell

实现：

```text
AppShell

Sidebar

Top Context Bar

Breadcrumb

Page Container

User Menu

System status

Command Search if supported
```

---

## PHASE 5 — Core UI Infrastructure

实现：

```text
PageHeader

Toolbar

DataTable

Filters

Drawer

Dialog

Form System

Empty State

Error State

Loading State

Status System
```

---

## PHASE 6 — Core Page Patterns

建立：

```text
Directory

List

Table

Master Detail

Entity Detail

Settings

Dashboard

Operations

Tree Manager

Permission Matrix

Log Explorer
```

---

## PHASE 7 — Business Migration

按照：

```text
Operations

Identity & Access

Organization

Governance

Settings

Developer
```

逐步迁移。

不要逐截图复制旧页面。

---

## PHASE 8 — Workflow Completion

验证：

```text
Create
Read
Update
Delete
Search
Filter
Inspect
Confirm
Recover
```

是否形成真实完整工作流。

---

## PHASE 9 — System States

补全：

```text
Loading

Empty

No result

Error

Denied

Read-only

Saving

Success

Failed

Unavailable integration
```

---

## PHASE 10 — Polish

最后才处理：

```text
Fine spacing

Micro interaction

Typography polish

Responsive behavior

Accessibility QA

Visual consistency
```

不要先从阴影和圆角开始。

---

# 76. 重构过程中允许删除旧 UI

不要把：

**Backward compatibility with bad UI**

作为设计目标。

如果旧：

```text
Layout
Component
Style
Page
Navigation
```

已经失去价值：

删除。

保留的是：

```text
Business capability

Backend contract

Required functionality
```

而不是旧视觉。

---

# 77. 不以现有截图作为新设计约束

当前 UI 只能用于理解：

```text
Existing capability
Existing routes
Existing content
```

不能用于决定：

```text
New skeleton
New component
New page
New navigation
```

不要进行：

```text
Screenshot A → Improved Screenshot A
```

而应进行：

```text
Existing Product
↓
Reconstructed Product Architecture
↓
New Admin System
```

---

# 78. 最终视觉标准

最终页面必须明显呈现：

```text
Clear hierarchy

High information efficiency

Calm visual system

Strong operational UX

Consistent interaction

Predictable navigation

Developer-level precision

Enterprise quality
```

必须避免：

```text
Over-carded

Over-rounded

Over-spaced

Over-colored

Over-decorated

Component-demo feeling
```

---

# 79. 最终产品标准

Community Go Admin 最终不应该让用户感觉：

> 后端已经有接口，所以做了一个页面把它显示出来。

而应该让用户感觉：

> 这是一个完整的 Administration Product。

最终体系：

```text
BACKEND
        ↓
PRODUCT MODEL
        ↓
WORKFLOW
        ↓
INFORMATION ARCHITECTURE
        ↓
INTERACTION SYSTEM
        ↓
DESIGN SYSTEM
        ↓
FRONTEND CAPABILITY
        ↓
ADMIN CONTROL PLANE
```

---

# 80. 开始工作的最终指令

不要从调整现有 Card、颜色或 Margin 开始。

不要先逐页面修改。

首先：

```text
Audit the entire product.
```

然后：

```text
Reconstruct the product architecture.
```

然后：

```text
Build the design system.
```

然后：

```text
Build the application shell.
```

然后：

```text
Build reusable admin interaction patterns.
```

最后：

```text
Migrate real backend capabilities into complete frontend workflows.
```

直接基于当前代码进行系统性设计和实现。

不要只输出设计建议。

不要只生成 Mockup。

不要创建假的 Backend Capability。

不要为了保留现有 UI 而限制新架构。

目标不是：

**Redesign several pages.**

目标是：

# Rebuild Community Go as a complete, production-grade Administration Control Plane.
