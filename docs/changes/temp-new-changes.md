# Community Go Admin WebUI — 前端产品能力系统性重构

你正在直接操作 Community Go 的真实产品代码。

本次任务不是简单 UI 改版，也不是重新套一个后台模板。

你的核心目标是：

> **完整兼容现有后端业务能力、接口能力、权限模型和数据模型，在不破坏 Backend Contract 的前提下，将 Community Go 的前端产品能力、交互能力、信息架构、设计系统和管理体验提升到当前主流成熟 Administration Console / SaaS Admin / Developer Platform 的产品水准。**

最终需要完成的是：

```text
Existing Backend
+
Mature Frontend Product Architecture
+
Mature Interaction System
+
Mature Design System
+
Production-grade UX
```

而不是：

```text
Existing Backend
+
Better-looking Components
```

---

# 一、核心原则

整个重构必须同时遵守两个原则。

## 原则 A：兼容现有 Backend Capability

后端是当前业务事实来源。

必须保留和兼容现有：

* API Contract
* Authentication
* Authorization
* Permission
* Role
* User
* Session
* API Token
* Organization
* Department
* Position
* Audit
* Navigation / Menu
* Runtime
* Metrics
* Management API
* Settings
* 以及代码中真实存在的其他能力

禁止为了设计方便擅自改变：

```text
Backend API
Permission semantics
Security semantics
Data relationships
Business rules
```

---

## 原则 B：前端不能被当前后端页面形态限制

兼容 Backend 不意味着：

```text
一个 API
=
一个页面
```

也不意味着：

```text
一个数据结构
=
一个 Form
```

更不意味着：

```text
Backend 返回什么
Frontend 就原样显示什么
```

Frontend 必须承担：

```text
理解
组织
搜索
筛选
导航
操作
反馈
防错
恢复
上下文保持
权限表达
状态表达
工作流编排
```

等产品责任。

必须将：

```text
Backend Capability
```

转换为：

```text
Frontend Product Capability
```

---

# 二、最终目标

将当前产品从：

```text
Backend APIs
        ↓
UI Components
```

升级为：

```text
Backend APIs
        ↓
Domain Model
        ↓
User Tasks
        ↓
Product Workflows
        ↓
Information Architecture
        ↓
Interaction Patterns
        ↓
Design System
        ↓
Production Frontend
```

最终产品必须达到成熟主流项目应具备的：

```text
Navigation maturity
Data management maturity
Interaction maturity
Form maturity
Permission maturity
Feedback maturity
Error handling maturity
Design system maturity
Responsive maturity
Accessibility maturity
Frontend engineering maturity
```

---

# 三、不要先改 UI

开始编码之前首先扫描整个项目。

不要看到现有页面以后直接：

```text
改颜色
改圆角
改 Card
改 Sidebar
```

首先完成：

# Product & Frontend Audit

---

# 四、扫描现有 Backend Capability

检查整个代码仓库中的：

```text
API definitions
API clients
routes
permissions
roles
entities
models
DTO
stores
queries
mutations
authentication
authorization
management endpoints
runtime endpoints
metrics
settings
```

建立：

```text
Backend Capability Map
```

格式：

```text
Domain

Backend Capability
API
Required Permission
Input
Output
Current Frontend Usage
Missing Frontend Capability
```

例如：

```text
IAM

Backend:
List users
Create user
Update user
Assign role
Reset password

Existing frontend:
Basic form

Frontend capability required:
User directory
Search
Filter
Detail
Edit
Role management
Security actions
Feedback
Validation
```

---

# 五、扫描现有 Frontend Capability

检查：

```text
Router
Layouts
Navigation
Tables
Forms
Drawers
Dialogs
Search
Filters
Pagination
State management
Query caching
Mutation handling
Error handling
Loading
Empty state
Permission guards
URL state
Theme
Design tokens
Accessibility
Responsive behavior
```

建立：

```text
Frontend Capability Gap Map
```

明确哪些：

```text
Missing
Weak
Duplicated
Incorrect
Backend-oriented
Component-oriented
```

---

# 六、不要按照旧页面重构

现有 UI 只作为：

```text
业务能力线索
```

而不是：

```text
设计规范
```

不要执行：

```text
旧 User 页面
→
新版 User 页面
```

应该执行：

```text
User Management Capability
↓
重新设计 User Management Experience
```

不要逐截图进行视觉翻新。

---

# 七、达到“主流成熟项目”的前端标准

重构后的 Community Go 至少应达到现代成熟项目常见的前端能力水平。

包括：

## Application Shell

## Navigation Architecture

## Data Table Infrastructure

## Search & Filtering

## Entity Detail

## Master–Detail

## Drawer

## Dialog

## Form System

## Validation

## Permission-aware UI

## Loading States

## Empty States

## Error States

## Mutation Feedback

## Destructive Action

## URL State

## Pagination

## Sorting

## Responsive

## Accessibility

## Design Tokens

## Component Architecture

## Consistent Interaction

---

# 八、重新建立 Information Architecture

不要直接沿用当前菜单结构。

根据业务能力重新建立：

```text
Global Navigation
↓
Domain
↓
Feature
↓
Page
↓
Entity Detail
```

可参考以下成熟后台的信息组织原则：

```text
Overview

Operations

Identity & Access

Organization

Governance

Settings

Developer
```

但具体结构必须依据真实 Backend Capability。

不要创造不存在的业务模块。

---

# 九、导航不应该暴露后端模块结构

不要按照：

```text
API Controller
Service
Database Entity
```

决定菜单。

菜单应该按照：

```text
User Mental Model
User Task
Frequency
Business Domain
```

组织。

例如多个 IAM API 可以共同组成：

```text
Identity & Access
```

而不是每个 API 各出现一个入口。

---

# 十、重新建立 App Shell

构建成熟 Administration Shell：

```text
┌────────────┬─────────────────────────────┐
│            │ Context / Top Bar           │
│ Sidebar    ├─────────────────────────────┤
│            │                             │
│            │ Main Workspace              │
│            │                             │
└────────────┴─────────────────────────────┘
```

---

# 十一、Sidebar

Desktop：

```text
232–248px
```

Collapsed：

```text
64–72px
```

结构：

```text
Brand

Navigation Groups

Primary Features

Secondary Features

Flexible Space

System / Help

Account
```

按 Domain 分组，而不是所有功能平铺。

例如：

```text
OPERATIONS

IDENTITY & ACCESS

ORGANIZATION

GOVERNANCE
```

---

# 十二、不要继续使用全局页面 Tabs

如果产品没有真正：

```text
multi-document
multi-workspace
multi-session console
```

需求，则移除全局：

```text
打开页面 Tab Bar
```

使用：

```text
Sidebar
Breadcrumb
Browser history
Deep link
```

完成导航。

后台应用不是浏览器。

---

# 十三、Top Bar

Topbar 应承担：

```text
Current Context

Breadcrumb

Global Search / Command

System Status

Help

Theme

Account
```

而不是成为第二套导航。

---

# 十四、统一 Page Architecture

所有页面基于统一骨架：

```text
Page

├ PageHeader
│ ├ Title
│ ├ Description
│ └ Actions
│
├ Toolbar
│ ├ Search
│ ├ Filter
│ ├ Sort
│ └ View
│
├ Main Content
│
└ Pagination / Footer
```

不要每一个页面自己设计一套结构。

---

# 十五、Admin 页面必须 Data First

后台产品的核心不是 Card。

核心应该是：

```text
Data
Task
Status
Action
```

优先使用：

```text
Table
List
Tree
Matrix
Timeline
Log
Chart
Inspector
Detail
Form
Split View
```

Card 只作为辅助信息容器。

---

# 十六、禁止 Card-first UI

不要执行：

```text
发现一组字段
↓
包一张 Card
```

页面视觉优先级应该为：

```text
Task
↓
Data
↓
State
↓
Action
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
Content
```

---

# 十七、建立 Production DataTable

DataTable 应成为整个系统核心基础设施之一。

根据实际页面能力支持：

```text
Search

Filter

Sort

Pagination

Row actions

Row selection

Batch actions

Column visibility

Sticky header

Loading

Empty

No results

Error
```

不要每个页面重新实现一套 Table。

---

# 十八、Search 必须是真实能力

所有 Search UI：

必须真正搜索数据。

根据 Backend Capability 决定：

```text
Server-side search
```

或：

```text
Client-side search
```

禁止存在纯视觉 Search Box。

---

# 十九、Filter

列表类页面根据数据支持：

```text
Status
Role
Type
Domain
Created time
Organization
```

等真实 Filter。

Filter 尽可能同步至 URL。

例如：

```text
/users?status=active&role=admin&page=2
```

刷新以后保持状态。

---

# 二十、URL 也是 Frontend State

重要页面上下文必须考虑 URL State。

支持：

```text
Refresh
Back
Forward
Share
Deep link
```

例如：

```text
/users/:id
```

或：

```text
/users?selected=user_id
```

不要把所有状态只存在 React/Vue Memory 中。

---

# 二十一、Master–Detail

成熟后台高频实体优先支持：

```text
Table
+
Detail Drawer
```

例如：

```text
Users
Roles
Permissions
Sessions
Tokens
Audit Events
```

用户查看详情时无需不断离开当前列表。

---

# 二十二、Detail Drawer

建立统一 Detail Drawer Pattern：

```text
Header

Identity

Status

Actions

Metadata

Tabs / Sections

Detail Content
```

Drawer 应支持：

```text
Loading
Error
Permission state
Deep link
Keyboard close
Focus management
```

---

# 二十三、Form System

建立统一：

```text
Label
Description
Input
Helper
Validation
Error
```

体系。

禁止：

```text
placeholder = label
```

表单必须具备：

```text
Client validation
Backend validation
Submitting
Success
Failure
Disabled
Read-only
Unsaved changes
```

---

# 二十四、Create Flow

创建复杂实体时，不要默认做：

```text
一个巨大 Form
```

根据复杂度选择：

```text
Modal

Drawer

Dedicated Page

Wizard
```

例如 Token 创建可以采用：

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
```

---

# 二十五、Mutation 必须完整

任何写操作：

```text
Create
Update
Delete
Enable
Disable
Assign
Remove
Revoke
Rotate
Reset
```

都必须拥有：

```text
Loading

Success

Failure

Retry / recovery when appropriate
```

禁止：

```text
Button click
↓
fake timeout
↓
Toast success
```

所有操作必须真实调用现有 Backend API。

---

# 二十六、Permission-aware Frontend

Frontend 必须真正理解 Permission。

根据当前用户权限控制：

```text
Navigation

Page visibility

Actions

Fields

Dangerous operations

Read-only states
```

对于没有权限的能力，根据场景：

```text
Hide

Disable

Read-only

Explain
```

不要所有事情都等 Backend 返回：

```text
403
```

之后才处理。

Backend 仍然是最终安全边界。

Frontend Permission 只负责用户体验。

---

# 二十七、Permission UX

不要让 permission code 主导页面设计。

技术 Permission：

```text
iam.account.self.profile.write
```

应作为 developer metadata。

给管理员显示：

```text
Update own profile

iam.account.self.profile.write
```

而不是只显示 permission code。

---

# 二十八、Permission Matrix

Role / Permission 管理优先设计：

```text
Grouped Permission Matrix
```

例如：

```text
Resource        Read   Create   Update   Delete

Accounts         ✓       —        ✓        —
Roles            ✓       —        ✓        —
Departments      ✓       ✓        ✓        ✓
```

真实 permission taxonomy 不是 CRUD 时：

根据真实模型生成。

不要硬套 CRUD。

---

# 二十九、状态系统

统一建立 Semantic Status System。

包括：

```text
Active
Inactive
Enabled
Disabled
Healthy
Degraded
Failed
Pending
Expired
Revoked
```

Badge 主要用于：

```text
State
Category
```

不要让：

```text
Permission
Version
ID
Metadata
```

全部变成 Badge。

---

# 三十、Loading System

建立：

```text
Page Skeleton
Table Skeleton
Panel Skeleton
Inline Spinner
Button Loading
```

避免整个系统只有一个 Spinner。

Loading Layout 尽可能贴近真实 Content Layout。

---

# 三十一、Empty State

成熟项目不能只显示：

```text
暂无数据
```

必须表达：

```text
What happened?

Why?

What can user do?
```

例如：

```text
No API tokens yet

Create a token to authenticate automated clients.

[ Create token ]
```

---

# 三十二、No Results

区分：

```text
Empty Data
```

与：

```text
No Search Results
```

Search 没结果：

允许：

```text
Clear filters
Change keywords
```

而不是显示 Create Entity。

---

# 三十三、Error Architecture

建立：

```text
Page Error

Section Error

Inline Error

Action Error

Permission Error

Network Error

Backend Error
```

局部接口失败不得轻易导致整页不可使用。

---

# 三十四、Backend 错误不能原样倾倒到用户界面

不能直接显示：

```text
500 Internal Server Error

SQL error

JSON parse error
```

普通用户看到：

```text
Unable to load users.
```

需要开发信息时：

可放入：

```text
Error details
Request ID
Trace ID
```

---

# 三十五、Feedback System

建立统一：

```text
Toast

Inline feedback

Banner

Dialog
```

使用规则：

Toast：

```text
Saved
Copied
Created
Updated
```

Inline：

```text
Validation
Field issue
```

Banner：

```text
Global warning
Service degradation
```

Dialog：

```text
Confirmation
Dangerous action
```

---

# 三十六、Destructive Action

删除、撤销、禁用、重置等操作必须具备：

```text
Clear consequence
Confirmation
Loading
Failure handling
Success feedback
```

重要实体可要求输入：

```text
entity name
```

或其他确认文本。

根据风险决定。

---

# 三十七、Runtime / Operations 前端能力

Runtime 不应只是：

```text
Backend metrics
→
Metric cards
```

应该成为：

```text
Operations Experience
```

根据真实 Backend Capability 组织：

```text
Overall Health

Runtime State

Requests

Dependencies

Metrics

Instances

Resources

Diagnostics
```

---

# 三十八、不要伪造监控能力

如果 Backend 只有：

```text
Snapshot
```

则显示：

```text
Live Snapshot
```

如果没有：

```text
Historical Metrics
```

就不要制作假 Trend Chart。

如果 Disk / Network 数据源没配置：

显示：

```text
Metrics source not configured
```

而不是把它当成服务器故障。

---

# 三十九、区分状态语义

必须正确区分：

```text
No data

Not configured

Unavailable

Unsupported

Degraded

Failed

Permission denied
```

这些必须拥有不同 UX。

---

# 四十、User Management 成熟化

用户管理不应该是：

```text
Create form
+
User selector
```

重构为：

```text
User Directory
```

支持真实能力范围内的：

```text
Search
Filter
Sort
Pagination
Inspect
Create
Edit
Role assignment
Security action
Session inspection
```

---

# 四十一、Role Management

Role 页面应支持：

```text
List

Search

Members

Permissions

Detail

Edit
```

而不是：

```text
select role
+
checkbox
+
save
```

---

# 四十二、Session Management

根据 Backend 数据设计：

```text
User
Session
Device / Client
IP
Created
Last active
Expires
Status
```

如果 Backend 没有 Device：

不要生成 Device 字段。

---

# 四十三、API Token Management

提升为成熟 Developer Console 水准。

Token List：

```text
Name
Status
Scope
Created
Expires
Last used
Actions
```

具体字段必须来自真实 API。

创建流程：

```text
Identity
Expiration
Scopes
Review
Create
```

Secret：

```text
只显示真实 Backend 返回的数据
```

如果 Backend 只返回一次：

UI 也只显示一次。

---

# 四十四、Organization Management

如果组织、部门、岗位存在层级：

优先考虑：

```text
Tree
+
Inspector
```

而不是把所有层级分别做成无关联 CRUD 页面。

前提：

必须符合真实 Backend Data Relationship。

---

# 四十五、Audit Log

成熟化为：

```text
Log Explorer
```

支持真实 Backend Capability 中的：

```text
Search
Filter
Date
Actor
Action
Resource
Result
Pagination
Detail
```

Event Detail 使用：

```text
Drawer / Detail
```

技术 metadata 使用：

```text
Structured view
Code view
```

---

# 四十六、Settings

把个人设置组织成成熟 Settings Experience。

例如：

```text
Settings

Profile
Account
Security
Notifications
Appearance
Language
```

使用 Local Navigation。

Settings Form 控制宽度。

不要让普通字段：

```text
1000px 宽
```

---

# 四十七、Design System 必须系统性重建

建立统一 Token：

```text
color
background
surface
text
border
spacing
radius
shadow
typography
motion
z-index
control-size
```

禁止页面自己定义设计标准。

---

# 四十八、视觉方向

整体定位：

```text
Professional
Technical
Calm
Dense
Precise
Structured
Modern
Enterprise
Developer-friendly
```

避免：

```text
过多 Card
过大圆角
过多阴影
过多彩色块
过多留白
Landing Page 风格
Dribbble Dashboard 风格
```

---

# 四十九、品牌视觉

Community Go 应该体现：

```text
Engineering
Infrastructure
Administration
Reliability
Precision
```

品牌不是靠大面积 Logo 和渐变。

品牌来自：

```text
Typography

Color discipline

Spacing rhythm

Interaction consistency

Data presentation

Technical precision
```

---

# 五十、Color

Blue 继续作为 Brand / Interactive Color。

用于：

```text
Primary Action
Link
Selected
Focus
Information
```

不要所有页面元素都变蓝。

建立成熟 Neutral Palette。

---

# 五十一、Typography

建立明确层级：

```text
Page Title       24–28px

Section Title    16–18px

Body             14px

Metadata         12–13px

Code             12–13px
```

技术字符串使用 monospace。

---

# 五十二、Density

后台优先：

```text
Information efficiency
```

而不是：

```text
Large whitespace
```

推荐：

```text
Page padding
24–32

Table row
40–48

Input
36–40

Button
32–36
```

根据现有 UI framework 合理落地。

---

# 五十三、Radius

整体采用克制圆角：

```text
Control
6–8px

Panel
8–12px

Dialog
12px
```

不要让 20–30px Radius 成为主要视觉语言。

---

# 五十四、Shadow

主要依靠：

```text
Surface
Border
Spacing
Typography
```

建立层级。

Shadow 只重点用于：

```text
Popover
Dropdown
Dialog
Floating layer
```

---

# 五十五、Responsive

成熟前端至少支持：

```text
Desktop

Small Desktop

Tablet

Basic Mobile
```

但这是 Admin：

优先保证：

```text
1440
1600
1920
2560
```

环境下的信息效率。

不要为了 Mobile 牺牲 Desktop。

---

# 五十六、Accessibility

达到现代成熟项目基础水准：

```text
Keyboard navigation

Visible focus

ARIA

Semantic HTML

Form labels

Dialog focus management

Escape close

Contrast

Reduced motion
```

Icon-only Action 必须具有：

```text
Tooltip
aria-label
```

---

# 五十七、Command Search

如果当前架构适合，实现真实：

```text
Ctrl / Cmd + K
```

至少支持：

```text
Navigate to pages
```

如 API 和数据结构允许，再支持：

```text
Search users
Search roles
Search resources
```

如果无法实现真实能力：

不要放假的 Command UI。

---

# 五十八、Frontend Engineering Standard

重构后应形成：

```text
Design Tokens

Primitives

Semantic Components

Page Patterns

Business Modules
```

结构。

而不是：

```text
Page-specific CSS
Page-specific Card
Page-specific Button
```

---

# 五十九、核心组件层

根据现有技术栈建立类似：

```text
AppShell

Sidebar

Topbar

PageHeader

PageToolbar

DataTable

FilterBar

StatusBadge

CodeText

DetailDrawer

ConfirmDialog

DangerZone

FormField

SettingsSection

EmptyState

ErrorState

LoadingState

PermissionMatrix

TreeView

LogViewer

Pagination
```

组件名称可根据代码规范调整。

---

# 六十、组件必须是 Semantic Component

优先：

```text
PermissionMatrix

StatusBadge

DetailDrawer
```

不要：

```text
BlueCard

PrettyBox

RoundedPanel2
```

组件名称应该表达：

```text
Responsibility
```

而不是：

```text
Appearance
```

---

# 六十一、兼容现有技术栈

首先识别：

```text
Framework
Router
State library
Query library
UI framework
Form system
CSS strategy
```

如果现有技术可以完成目标：

继续使用。

不要为了重构 UI 无意义地更换：

```text
React/Vue
Router
Query library
UI framework
```

只有当现有架构明显无法支持成熟化时才局部调整。

---

# 六十二、保留真实 Backend Contract

前端可以：

```text
重新组合 API

重新设计流程

重新安排页面

重新设计导航

重新设计组件

重新设计视觉
```

但不能未经必要性判断擅自：

```text
修改 Backend API

修改 Permission semantics

修改数据关系

改变安全规则
```

---

# 六十三、允许 Frontend Adapter Layer

如果 Backend 返回的数据过于后端化：

不要直接在 UI 到处处理。

允许建立：

```text
API
↓
Adapter / Mapper
↓
Frontend View Model
↓
UI
```

例如将：

```text
iam.account.self.password.write
```

转换为：

```text
label
description
domain
action
technicalCode
```

但必须保留原始 Permission Code 用于实际授权。

---

# 六十四、Frontend 可以比 Backend 更聪明

允许前端提供：

```text
Grouping

Sorting

Derived labels

Human-readable formatting

Contextual actions

Search

Navigation

Local filtering

Data composition

View state

Progressive disclosure
```

这些属于：

**Frontend Product Capability**

不要求 Backend 为每个 UI 行为新增接口。

---

# 六十五、但禁止虚构业务数据

Frontend 可以计算：

```text
Display name

Status label

Percentage

Grouping

Formatting
```

但不能凭空制造：

```text
Historical data

Activity logs

Locations

Analytics

Permissions

Business states
```

---

# 六十六、Progressive Disclosure

不要一次把所有后台字段显示出来。

分为：

```text
Primary Information

Secondary Information

Technical Metadata

Advanced Settings
```

默认展示用户完成任务所需信息。

Technical Detail 可以通过：

```text
Drawer

Accordion

Advanced section

Code block
```

进一步查看。

---

# 六十七、前端能力补齐原则

发现后端存在能力，而当前前端只是：

```text
Button
Input
Checkbox
Card
```

时，不要认为：

```text
功能已经完成
```

检查它是否缺少：

```text
Discovery

Context

Search

Filter

Detail

Validation

Confirmation

Feedback

Recovery

Permission handling

Loading state

Empty state

URL state
```

如果缺失：

将其补齐到合理成熟度。

---

# 六十八、不要为了“成熟”过度设计

成熟项目不是：

```text
功能越多越好
```

而是：

```text
真正需要的功能完整
```

不要无依据增加：

```text
Export

Batch operations

Advanced filters

Drag and drop

Analytics

Charts

Realtime

Command actions
```

每个能力必须满足：

```text
有真实需求
或
基于现有数据能够合理实现
```

---

# 六十九、复杂度必须与业务匹配

Simple feature：

保持简单。

Complex feature：

提供完整 workflow。

不要：

```text
简单 Profile
→
做成 5 步 Wizard
```

也不要：

```text
复杂 Token Permission
→
几十个 checkbox 一页结束
```

---

# 七十、性能

成熟项目必须考虑：

```text
Large lists

Pagination

Request cancellation

Debounce

Caching

Loading

Rerender

Lazy loading

Code splitting
```

不要为了视觉重构降低现有性能。

---

# 七十一、Query / Mutation 体系

如果项目已有成熟 Query Layer：

统一使用。

避免：

```text
每个组件自己 fetch
```

建立清晰：

```text
Query

Cache

Mutation

Invalidation

Error

Loading
```

流程。

---

# 七十二、Design QA

重构后检查所有页面是否遵循同一系统：

```text
Same header

Same table

Same filter

Same button hierarchy

Same drawer

Same form

Same status

Same feedback

Same spacing

Same typography
```

用户不应该感觉每个模块来自不同开发人员。

---

# 七十三、Interaction QA

检查：

```text
Hover

Focus

Keyboard

Loading

Disabled

Success

Failure

Back

Refresh

Deep link

Permission denied
```

---

# 七十四、Backend Compatibility QA

对所有旧有真实功能建立 checklist：

```text
Can still read?

Can still create?

Can still update?

Can still delete?

Can still authorize?

Can still revoke?

Can still configure?

Can still diagnose?
```

不能因为 UI 重构造成能力丢失。

---

# 七十五、不要保留“后端管理页面”的思维

最终前端不应该像：

```text
API 调试界面

Backend Capability Explorer

CRUD Generator
```

应该像：

```text
Administration Product
```

区别在于：

```text
Backend exposes operations.

Frontend organizes work.
```

---

# 七十六、实施顺序

严格按照以下顺序执行。

## Phase 1

扫描真实：

```text
Backend
Frontend
Routes
Permissions
Data models
```

---

## Phase 2

建立：

```text
Backend Capability Map

Frontend Capability Gap Map
```

---

## Phase 3

设计：

```text
Information Architecture

Navigation

User workflows

Entity relationships
```

---

## Phase 4

建立：

```text
Design Tokens

Typography

Color

Spacing

Density

Radius

Interaction states
```

---

## Phase 5

重建：

```text
App Shell

Sidebar

Topbar

Breadcrumb

Workspace
```

---

## Phase 6

建立成熟前端基础设施：

```text
DataTable

Search

Filter

Pagination

Drawer

Dialog

Form

Feedback

Loading

Empty

Error

Permission UI
```

---

## Phase 7

按照 Domain 重构：

```text
Operations

Identity & Access

Organization

Governance

Settings

Developer
```

---

## Phase 8

将现有 Backend Capability 接入新的 Frontend Workflow。

---

## Phase 9

验证所有旧 Backend 能力没有丢失。

---

## Phase 10

补齐：

```text
Responsive

Accessibility

Performance

Visual QA

Interaction QA
```

---

# 七十七、每个模块必须进行 Capability Review

每个模块完成前回答：

```text
Backend 已经提供了什么？

当前 Frontend 已经提供了什么？

主流成熟产品通常需要哪些基础 Frontend Capability？

哪些可以基于现有 Backend 真实实现？

哪些目前不能实现？

最终应该保留哪些？
```

只实现：

```text
真实
合理
有价值
可维护
```

的能力。

---

# 七十八、最终验收标准

最终用户应该感受到：

```text
数据很好找

功能很好理解

操作很好完成

状态很好判断

错误很好恢复

权限很好理解

页面之间行为一致

系统信息密度合理

技术信息专业但不干扰任务
```

---

# 七十九、视觉验收

最终 Community Go 不应该看起来像：

```text
UI Library Demo

CRUD Template

Backend Panel

Component Showcase
```

而应该明显属于：

```text
Modern Administration Console

Developer Platform

Enterprise Control Plane
```

---

# 八十、最终产品模型

最终架构：

```text
Backend Capability
        ↓
Compatibility Layer
        ↓
Frontend Domain Model
        ↓
Product Capability
        ↓
Workflow
        ↓
Page Pattern
        ↓
Design System
        ↓
Production UI
```

Backend 负责：

```text
Data
Rules
Security
Persistence
Business capability
```

Frontend 负责：

```text
Understand
Navigate
Discover
Inspect
Operate
Validate
Confirm
Feedback
Recover
Visualize
Organize
```

两者职责必须明确。

---

# 八十一、最终执行指令

现在不要进行局部 UI 美化。

不要按照当前页面逐个换皮。

首先全面扫描真实项目代码。

识别：

```text
Backend capabilities

Frontend capabilities

Capability gaps

Information architecture problems

Interaction problems

Design system problems
```

然后重新设计完整前端产品架构。

保持所有有效 Backend Capability 可用。

不创建假的后端能力。

在现有后端之上补齐成熟 Frontend Product Capability。

所有新增交互必须真实可用。

所有 Backend Action 必须形成完整 UI 闭环。

最终将 Community Go 从：

```text
“拥有后台能力的前端界面”
```

升级为：

# “拥有成熟前端产品能力的 Production-grade Administration Control Plane”

目标不是单纯让 UI 更漂亮。

目标是同时达到：

```text
Backend Compatibility
+
Frontend Capability Maturity
+
Product UX Maturity
+
Design System Maturity
+
Engineering Maturity
```

直接开始进行：

**Audit → Architecture → Foundation → Implementation → Migration → QA**

不要停留在建议层。

基于真实产品代码完成系统性重构。
