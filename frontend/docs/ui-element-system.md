# UI Element System

本文是 `/frontend` 基础 UI 分类、组件语义和组合边界的当前权威。它不按 TailAdmin 菜单或 HeroUI 导出列表复制组件；分类只服务于项目长期治理、复用和验证。

## 1. 分层职责

```text
Semantic Design Token
  -> Interaction Primitive（HeroUI / React Aria）
  -> UI Element（项目稳定语义）
  -> Composite / Pattern（跨 Element 组合）
  -> Feature Component（业务语义）
  -> Page / Host（路由与平台装配）
```

- HeroUI 负责 Accessibility、Keyboard、Focus、Selection、Overlay、Portal 和 Collision。
- `packages/design-system` 负责颜色、尺寸、空间、圆角、阴影、层级和动效语义。
- `packages/ui-adapter` 把底层能力收敛为项目 UI Element；不得暴露 HeroUI props 或 DOM。
- Tailwind CSS v4 可在整个 `/frontend` 消费项目 Semantic Token，负责布局、响应式、主题、密度和视觉组合；只有 HeroUI 直接依赖以及 Tailwind styling HeroUI compound parts 必须止于 UI Adapter。
- Composite 只组合已有 Element 与 Layout，不重新定义控件、浮层或状态视觉。
- Feature 拥有业务文案和状态选择，不创建第二套基础组件。

## 2. 当前分类

| Family                | 稳定语义                     | 当前 Element / Pattern                                                                                                                     | 不应混入                     |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Actions               | 发起命令或提交               | `Action`、`IconAction`                                                                                                                     | 导航链接、值选择             |
| Form Controls         | 输入、编辑或选择表单值       | `TextField`、`TextAreaField`、`SelectField`、`ComboField`、`DatePickerField`、`RadioGroupField`                                            | Action Menu、Navigation Menu |
| Selection             | 独立布尔或集合选择           | `CheckboxField`、`SwitchField`、`ToggleGroup`                                                                                              | 用 Switch 代替即时动作       |
| Identity / Display    | 展示身份与键值信息           | `Avatar`、`UserIdentity`、`DescriptionList`                                                                                                | 业务权限或在线状态机         |
| Navigation            | 页面、层级、集合或视图切换   | `TextLink`、`BreadcrumbTrail`、`PaginationControl`、`TabsView`、Host Router Link、Shell Navigation                                         | 表单值提交                   |
| Feedback              | 解释操作结果或风险           | `AlertBanner`、`NotificationCard`、`FeedbackProvider` / Toast                                                                              | 长期数据状态标签             |
| Status / Async        | 表达对象状态或等待范围       | `Badge`、`StatusPill`、`StateSurface`、`ProgressMeter`、`BusyIndicator`、`Skeleton`                                                        | 交互按钮、万能全屏遮罩       |
| Data Display          | 展示结构化数据               | `DataTable`；Collection Toolbar / Filter / Pagination / Bulk Action 留在 Pattern                                                           | 表单输入与操作菜单           |
| Overlay / Floating UI | 在普通页面层之上承载短期交互 | `MenuButton`、`PopoverCard`、`TooltipAction`、`DialogSurface`、`ConfirmDialog`、`DestructiveConfirmDialog`、`DrawerSurface`、`CommandMenu` | 普通 Card / Panel 外壳       |
| Surface / Layout      | 建立内容与页面空间关系       | `Card` Anatomy、`Panel`、Page Layout Contract                                                                                              | 业务状态和数据请求           |

Media 只有出现真实产品场景后才建立稳定 Element；图片、视频比例等局部内容布局默认留在 Feature Composition。

## 3. Action Family

`Action` 用于执行即时命令或提交表单，`IconAction` 用于空间受限且图标语义稳定的同类操作。页面跳转和外部地址必须使用 Link 或 Router Navigation，不得把导航伪装为 `onPress` 命令。

- Primary 表达当前 Surface 的一个主要动作；Secondary 承担普通辅助动作；Quiet 用于低强调工具动作；Danger 只用于具有破坏后果的动作。
- `loading` 是受调用方控制的 Pending 状态：保留原按钮文字、显示进度、通过 HeroUI/React Aria 标记 Pending 并阻止重复触发；它不是普通 Disabled 的视觉别名。
- `disabled` 表达当前动作不可用。业务组合应在相邻上下文说明原因，不得只依赖降低透明度传达限制。
- `sm`、`md` 与 `lg` 只改变稳定的控件高度和横向 Padding；Feature 不得自行覆盖按钮高度制造第四套密度。
- 纯图标操作必须使用 `IconAction` 并提供可访问名称；不得传入空文字的 `Action` 充当 Icon Button。

## 4. Identity、Display 与 Navigation Family

- `Avatar` 统一 image、fallback、size 与 presence；`UserIdentity` 只组合 Avatar、名称和说明，不承担用户菜单、权限或在线状态推导。Shell 账号入口与 DataTable/详情身份展示共享该契约。
- `DescriptionList` 负责 term/description 关系、缺失值与窄屏重排，不把详情键值对伪装成表格，也不拥有业务字段格式化。
- `TextLink` 保留 anchor 语义与可访问导航；SPA 路由由 Host Router Link 注入，UI Adapter 不依赖 React Router。Action 不承担导航。
- `BreadcrumbTrail` 表达层级和当前位置；`PaginationControl` 表达 current、previous/next、ellipsis 与总页数。筛选、排序、页码归一和远端请求属于集合 Pattern。
- `TabsView` 只表达同一内容域中的视图选择。应用级 Workspace Tabs 需要保活、关闭和恢复生命周期，当前没有该场景，不与 Content Tabs 合并。

## 5. Feedback 与 Status Family

Feedback 解释刚发生的结果、风险或可恢复问题；Status 描述对象当前所处的稳定状态。两者可以共享 Tone Token，但不得因为颜色相同而互换语义。

- `AlertBanner` 是页面流内的信息块，默认不加入 Live Region。只有内容在用户操作后动态出现且需要辅助技术及时播报时，才选择 `polite`；会阻断当前安全操作的紧急失败才选择 `urgent`。
- `NotificationCard` 是可操作的静态通知组合，不等同于全局 Toast。它固定包含主要动作和关闭动作；可选次要动作必须同时提供文案与处理函数。
- `FeedbackProvider` 显式拥有全局 Toast queue 与 Region；Feature 只通过 `useFeedback` 发送 tone、title、description 和可选 action，不直接访问 HeroUI queue。Toast 用于用户动作后的短暂反馈，不能代替流内 Alert、长期 Notification 或对象 Status。
- `Badge` 表达类别、属性或短元数据，可使用 Soft/Solid、Icon 与尺寸；`StatusPill` 专门表达对象生命周期状态，保持 Dot + Soft 的单一结构。
- `StateSurface` 承担 Empty、Error、Offline、Permission 等大范围内容状态；恢复动作的文案与处理函数必须成对，禁止渲染无行为按钮。静态状态默认不进入 Live Region；只有用户操作后动态出现的结果才显式选择 `polite`，会阻断安全操作的紧急失败才选择 `urgent`。
- `ProgressMeter` 只表达已知的确定进度；它复用 HeroUI/React Aria 的 ProgressBar 数值与 ARIA 语义，并由项目样式固定 Label、Output、Track 和 Fill。未知等待使用 `Action loading`、Skeleton 或 Loading State，不伪造百分比。
- `BusyIndicator` 表达非确定等待并保留可访问 label；按钮 Pending、局部 Busy、内容 Skeleton 与页面 Loading 按作用域组合，不建立默认阻断整个工作区的万能 Loading Overlay。
- `Skeleton` 只提供视觉占位并保持 `aria-hidden`；所属 Composition 必须另有可访问的 Loading 文案与 Busy 容器。`data-slot="skeleton"` 只用于稳定的组合回归定位，不承载产品语义。

## 6. Form Control Family

所有 Form Control 共享以下不变量：

- Control Height、Typography、Background、Border、Radius、Placeholder、Focus、Disabled 和 Invalid 来自同一语义样式。
- Label、Description 与 Validation Message 使用同一层级；Error 替代 Hint，不同时制造两条互相竞争的说明。
- Text Input、Textarea、Select Trigger、ComboBox InputGroup 与 DateField Group 在同一密度下必须可以并排比较。
- 复合控件只允许最外层 InputGroup 负责 Border、Background、Radius 和 Focus Surface；内部 `Input` 必须保持透明、无边框的 Primitive 形态。
- `fullWidth` 是表单列中的稳定默认；局部宽度由布局容器控制，不由 Popup 内容反向决定。
- `RadioGroupField` 负责单选表单值；`ToggleGroup` 负责即时互斥视图偏好。两者可以视觉相近，但不得交换提交时机和 ARIA 语义。

当前语义尺寸由 `--spacing-control` 管理，Option 触控高度由 `--spacing-option` 管理。业务页面不得复制对应数值。

## 7. Anchored Overlay

Anchored Overlay 负责 Trigger 与 Popup 的空间关系，定位和碰撞继续由 HeroUI 管理。项目只固定产品语义：

| Width Strategy  | 语义                                       | 当前使用                       |
| --------------- | ------------------------------------------ | ------------------------------ |
| `match-trigger` | Popup 宽度等于 Trigger，表单列保持几何连续 | `SelectField`、`ComboField`    |
| `min-trigger`   | Popup 不窄于 Trigger，允许内容扩张         | 预留；出现真实复用场景前不公开 |
| `content`       | Popup 根据操作或说明内容决定宽度           | Action Menu、Popover、Tooltip  |

普通 Select 与 Combobox 固定使用 `match-trigger`。它们依赖 HeroUI 提供的 `--trigger-width` 与 Portal/Collision，不把 Popup 放入普通文档流，也不通过业务页宽度补丁修正。

Listbox 的滚动属于列表内部责任：Overlay Surface 提供外壳，Listbox 负责 Maximum Height、Overflow 和 Option 排列。

`/ui-elements/forms` 中的 Select 与 Combobox 必须保留足以触发内部滚动的大集合，并包含 Disabled Option。交互回归需同时证明内容高度超过 Listbox 可视高度、键盘能够滚动到末项以及筛选后仍能完成选择；仅检查 `overflow: auto` 声明不构成滚动能力证据。

## 8. Data Display

`DataTable` 只负责结构化数据的行列语义、密度、横向滚动、排序状态与可选的单选/多选，不内置搜索、筛选、分页、批量动作或请求状态。后者属于拥有真实数据状态的 Feature Composition。

- 默认表格是纯展示；只有显式传入 `selection` 才启用 HeroUI `Table.Content` 的 single/multiple、Selected 与 Keyboard Navigation。Selection Contract 使用项目 ID，不泄露 HeroUI `Selection` 类型；不得给每行挂载无行为的 `onAction` 来伪造可操作性。
- 只有显式传入 `sort` 的列才暴露排序交互与 `aria-sort`；DataTable 回传 column ID/direction，Feature 负责稳定排序、筛选后页码归一和数据请求。
- 每张表必须提供 `emptyContent`，由 HeroUI `Table.Body.renderEmptyState` 保证空集合仍有可读反馈。需要说明原因、恢复操作或离线语义时，Feature 可以用 `StateSurface` 替换整个表格 Composition。
- 至少一个能够唯一识别行的列应声明为 `rowHeader`；状态和确定进度分别组合 `StatusPill` 与 `ProgressMeter`，不在 Cell 中创造第二套视觉。
- Comfortable 与 Compact 只改变稳定的 Cell Padding，不改变触控、选择和键盘语义。
- `Table.ScrollContainer` 是横向溢出的唯一所有者；父 Section 不再增加第二层横向滚动。
- 搜索、筛选、分页和 Footer 只有接入真实集合、总量和请求状态后才能进入 Pattern；禁止为展示完整度添加静态假分页或空操作列。

## 9. Overlay Surface 与 Option State

`ui-overlay-surface` 是 Dropdown、Select、Combobox、Popover、DatePicker、Dialog、Drawer 和 Command 共用的 Surface 语义，统一 Background、Border、Radius、Shadow 和文字颜色。不同 Overlay 只决定内容 Padding、宽度策略和结构，不复制一套 Surface。

`PopoverCard` 当前只承载与 Trigger 直接相关的短说明，使用内容宽度和稳定的 `bottom start` Placement；打开时 HeroUI 将焦点移入 Popover Dialog，Escape 关闭后再返回 Trigger。它不是表单值选择、命令列表或强制确认。更短且不可交互的补充说明使用 `TooltipAction`，操作集合使用 `MenuButton`，必须阻断主流程并等待决策时使用 `DialogSurface`。外部参考出现更多方向或内容组合，不自动扩大项目 API；只有真实产品场景需要时才新增可验证的交互内容或 Placement 语义。

`ui-option` 是 Listbox 与 Menu Item 的共享状态基线：

- Default：普通文字与透明背景。
- Hover / Keyboard Focus：使用低强调 Surface，表达当前指向位置。
- Selected：使用 Brand Soft、Brand 文字和更高字重，表达持久选择。
- Disabled：降低强调且不可操作。
- Danger：保留 Option 的尺寸与 Focus 规则，只替换语义色。

Hover/Focus 与 Selected 不得合并为同一种状态；Selected 不能只依靠 Hover 才可见。

## 10. Composition Rules

- 一个视觉 Surface 只能由一层负责 Border、Radius、Shadow、Background 和外部 Padding。
- 父 Surface 通过内边距拉开子 Element；不得为了解决贴边问题改写子组件自身 Variant。
- 已有外壳进入 Panel、Dialog、Drawer 或 Form 时，应使用 Primitive、Embedded 或 Slot，而不是完整组件套完整组件。
- Scroll Container 由实际拥有滚动内容的一层负责；父子不能重复声明滚动和固定高度。
- Page Header、Toolbar、Filter Bar、Section、Split View 与 Footer Actions 通过 Layout Contract 组合，不在每个 Page 重写同类骨架。
- `Card` 拥有 Header/Content/Footer 的内容 anatomy；`Panel` 只作为 Layout Surface。已经存在父 Surface 时使用 flat/embedded composition，不叠加第二套 Border、Radius 和 Shadow。
- 承载文字的 Page 与 Surface 不参与整体 Opacity 动画；否则进入中间帧会改变 Semantic Token 的实际对比度。Opacity Motion 只用于 Scrim 等无文字装饰层，内容型 Overlay 使用自身成熟交互契约。
- 路由级页面转场是浏览器 View Transitions API 快照层的例外路径：深入导航播放 `nav-forward` 方向滑动；无类型提交（浏览器后退/前进、hydration/Suspense reveal）瞬时切换、不播放动画，不改变任何 Semantic Token 的中间对比度。转场样式与时长/缓动只能来自 `packages/design-system` 的 `motion.css` 与动效 Token；页面不得为转场自建组件级透明度动画或硬编码时长颜色。
- 异步数据区域（Loading/Empty/Error/Ready）的状态切换由 `AsyncRegion`（ui-adapter，组合 `Skeleton`/`StateSurface` 的 Pattern）编排：内容进场绑定 `content.enter` 配方，区域容器承担 `aria-busy` 与 `data-state` 语义。AsyncRegion 属于 Pattern 而非 Element，不进 `/ui-elements` 目录，权威载体为 `/reference`（Pattern Reference）与 `/states`（状态体系）。

## 11. UI Elements 与质量证据

- `/ui-elements` 是公开 UI Contract 的可执行目录，按 9 个 Family 拆分为独立页面。当前 45 个可见 Element 必须各自拥有一个独立 `ComponentPreview`，展示准确名称、支持状态清单和真实交互；9 个 Family 页面负责导航与逐族视觉基线，禁止再用一个混合 Demo 代替完整度声明。
- 每个状态清单都是验收声明，必须能在同一 Preview、确定性 URL、自动化交互或该 Family 的视觉基线中找到对应证据；不能展示的状态不得写入清单。
- `/ui-elements` 按 Family 暴露 Variant、Size、Tone、Icon、Disabled、Loading、Long Content、Edge Case、Dark Theme 和可交互状态；不适用于某个 Element 的维度由其稳定职责裁决，不创建无语义 Variant 凑矩阵。
- Action 必须验证 Focus、Pending、Disabled 和尺寸序列；Pending 与 Disabled 不得合并成同一状态证据。
- Identity / Display 必须验证 Avatar image/fallback/size/presence、UserIdentity 长文本与 DescriptionList 缺失值；Navigation 独立验证 Breadcrumb、TextLink、Pagination、Tabs 与真实 Host Router 边界；Busy 归入 Async。
- Feedback 的可见动作必须具备真实处理函数；静态 Alert 不得自动声明为 Live Region，动态 Announcement 必须按影响选择播报强度。
- Status Family 必须在 `/ui-elements` 对应 Family 页面中并排暴露生命周期 Tone 与确定进度；`/states` 长期覆盖 Loading、Empty、Error、Success、Warning、Disabled、Pending、Offline 与 Permission Denied。Progress 边界值、Skeleton 的辅助技术可见性、Busy 容器和 Error 恢复路径必须进入自动化回归。
- Data Display 必须在 `/ui-elements/data` 中暴露 Row Header、Density、Selected、Keyboard Selection 与 Empty Collection；Pattern Reference 继续验证筛选、Master-Detail 与异常状态组合。
- Select、Combobox、Dropdown、Popover、Tooltip、DatePicker、Command、Dialog、Confirm 与 Drawer 必须保留打开态视觉基线；Toast 必须通过显式 Provider 和确定性 URL 验证。
- Form Selection 的视觉回归必须断言 Popup 使用 Trigger 宽度且 Listbox 自己滚动。
- 关键 Overlay 必须验证 Escape、焦点返回、Keyboard Navigation、ARIA 与 Axe WCAG AA。
- `/reference` 与 `/reference/form` 是 Pattern Reference，用于验证 Element 进入 Toolbar、Filter、Table、Master-Detail、Split View 和复杂 Form 后仍保持契约。
- `architecture:check` 禁止 Feature 使用原生表单控件、直接消费 Adapter 内部 `ui-*` Element 样式，或在 Design Token 权威文件之外声明硬编码颜色。

## 12. 演进规则

新增基础能力前按顺序判断：

1. 该能力是否属于动效：先查 [Motion Foundation 与语义动效分层](motion-foundation.md) 的配方登记表与容器目录，确认是否已有配方、语义容器或 HeroUI 浮层能力可复用。
2. 已有 Element 是否已经表达该语义。
3. 是否只是已有 Element 的稳定 Variant 或 Density。
4. 是否应由 Composition、Slot、Primitive 或 Feature 局部结构完成。
5. 只有存在跨 Feature 的独立语义、状态和验证价值时才新增 UI Element。

公共 Token、Form Control、Overlay Surface、Option、Layout 或 Adapter 改动必须同步检查全部调用方、`/ui-elements` 对应 Family 页面的打开态、Pattern Reference、Dark Mode、Locale 扩张、窄屏和 Accessibility。外部成熟产品只用于复核设计规律，内部权威始终是本文、Semantic Token、UI Adapter 与可运行回归证据。
