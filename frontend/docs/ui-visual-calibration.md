# UI 视觉校准基线

- 最近复核：2026-08-30
- 外部基准：[TailAdmin React Demo · UI Elements](https://react-demo.tailadmin.com/)
- 内部权威：`/showcase` 与 `packages/ui-adapter`

## 1. 职责边界

TailAdmin 的 `UI Elements` 用于校准后台产品的视觉秩序和组件完整度；HeroUI 提供 Accessibility、Keyboard Navigation、Focus Management、Overlay 与 Portal 等成熟交互基础；本项目的 Semantic Design Token、UI Adapter 与 Showcase 决定最终产品规范。

校准只学习 Typography、信息层级、比例、留白、语义色、Border、Radius、Shadow、Icon/Text 关系及完整状态表达。禁止复制 TailAdmin 的源码、DOM、CSS、图片资产和具体尺寸数值，也不得为了接近参考而绕过 HeroUI 自行实现 Overlay。

优先级固定为：

1. 业务页面遵守内部 Showcase 和 UI Adapter。
2. 内部缺少合理能力时，复核对应 TailAdmin 页面并扩展 Design System。
3. HeroUI 负责交互与可访问性；项目 Token 和 Adapter 负责产品视觉。
4. TailAdmin 与内部规范冲突时，以已经验证并记录的内部规范为准；若冲突暴露明显漂移，则先修订 Showcase，不在业务页打补丁。

## 2. 已确认的视觉规律

- 信息层级：页面背景低噪声，Section 使用轻边框 Surface 分组，只有 Overlay 和主要操作使用更高视觉层级。
- Typography：标题、正文、帮助文本和状态文本层级明确；粗体用于标题与关键动作，不用大面积高字重制造层级。
- 尺寸与留白：同一组件族保持一致高度、图文间距和触控面积；紧凑不等于压缩可点击区域。
- 颜色语义：Brand 只突出主要动作和 Selected；Success、Warning、Danger、Info 在 Alert、Badge、Notification 与状态表面中保持同义。
- Border、Radius、Shadow：页面内分组主要靠 Border 与 Surface；Shadow 只用于 Elevated Surface 和 Overlay。嵌套 Surface 主动移除重复边框、圆角和阴影。
- Icon/Text：Icon 辅助识别，不代替文本语义；Icon 与文本共享基线和一致间距。
- 状态完整性：Default、Hover、Focus、Active、Selected、Disabled、Loading、Error、Open、Closed 都属于组件契约，不能只验证静态 Trigger。
- Overlay：Trigger 和浮层使用同一视觉语言；浮层需同时治理背景、边框、圆角、阴影、间距、文字、Hover、Selected、Focus、Disabled 和 Motion。

本轮实际复核 TailAdmin `Alerts`、`Form Elements`、`Dropdowns` 与 `Tabs`：Alerts 以 Success、Warning、Error、Info 的同构层级保持语义一致；Form Elements 将 Input、Select、Password、Date Picker、Input Group、Textarea 与状态放在同一页面对比；Dropdowns 同时展示 Default、Divider、Icon 与 Icon+Divider；Tabs 同页展示 Default、Underline、Icon、Badge 与 Vertical，但每组都由外层 Section 和内层内容 Surface 承担边界与留白，Tab 本体只表达视图选择。由此确认项目不应按页面分别塑造控件或 Popup，也不应为贴边问题改写 Tabs Variant；共享 Form Control、Overlay Surface、Option State 与父级 Composition 分别承担各自职责。

HeroUI 当前 `Select`、`ComboBox` 和 `Popover` 继续承担 ARIA、Keyboard、Focus、Portal、Placement 与 Collision；项目利用其 Trigger 宽度变量实现表单选择浮层的 `match-trigger` 策略，不自行重写定位系统。内部分类与完整契约见 [UI Element System](ui-element-system.md)。

## 3. UI Elements 校准矩阵

| TailAdmin 页面                                                  | 本轮观察重点                                                  | 项目内部落点                                 | 当前结论                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| [Alerts](https://react-demo.tailadmin.com/alerts)               | 四类语义、Icon/标题/说明/动作层级、轻底色与边框协作           | `AlertBanner`、Showcase `Alert` 区           | 已采用项目语义 Token 重新实现                                            |
| [Avatar](https://react-demo.tailadmin.com/avatars)              | 尺寸序列、圆形裁切、Online/Offline/Busy 指示                  | 未来身份与协作场景                           | 已复核；无真实产品用例前不新增公共契约                                   |
| [Badge](https://react-demo.tailadmin.com/badge)                 | Soft/Solid、语义色、左右 Icon、短文本密度                     | `Badge`、`StatusPill`、Showcase `Badge` 区   | 已采用 Soft/Solid 与语义 Tone                                            |
| [Breadcrumb](https://react-demo.tailadmin.com/breadcrumb)       | 层级、分隔符、当前位置、Icon 可选性                           | `PageHeader` / `Breadcrumbs`                 | 已有内部权威；不增加页面级变体                                           |
| [Buttons](https://react-demo.tailadmin.com/buttons)             | Primary/Secondary、左右 Icon、统一高度与字重                  | `Action`、Showcase `Action Variants`         | 已有内部权威；补齐 Loading/Disabled/Focus 验证                           |
| [Button Groups](https://react-demo.tailadmin.com/buttons-group) | 连续边框、首尾圆角、Active 与邻项层级                         | 未来工具栏分段操作                           | 已复核；出现真实选择语义时再基于 HeroUI 能力扩展                         |
| [Cards](https://react-demo.tailadmin.com/cards)                 | 图片/文字/动作节奏、横向与纵向层级、链接语义                  | `Panel`、Showcase `Card 与 Surface` 区       | 确认 Elevated/Outlined/Embedded 三轨                                     |
| [Carousel](https://react-demo.tailadmin.com/carousel)           | Controls、Indicators、Controls+Indicators、媒体比例           | 未来媒体浏览场景                             | 已复核；无真实产品用例前不引入轮播依赖                                   |
| [Dropdowns](https://react-demo.tailadmin.com/dropdowns)         | Trigger Active、浮层 Shadow、Item 密度、Divider、Icon         | `MenuButton`、Showcase 与打开态快照          | Content Width；与 Form Selection 共享 Surface/Option，不共享选择语义     |
| [Images](https://react-demo.tailadmin.com/images)               | Responsive、2/3 Grid、裁切和容器比例                          | Feature Composition                          | 属于内容布局，不新增无语义 Adapter                                       |
| [Links](https://react-demo.tailadmin.com/links)                 | 语义色、Underline、Hover、Opacity 的辨识度                    | Typography / Feature Composition             | 保持链接语义与 Focus 可见；不提供任意透明度 API                          |
| [List](https://react-demo.tailadmin.com/list)                   | Ordered/Unordered、Icon、Action、Disabled、Checkbox/Radio     | Feature Composition 与 Form Control          | 按语义组合；不建立万能 List Wrapper                                      |
| [Modals](https://react-demo.tailadmin.com/modals)               | Default/Centered/Form/Fullscreen、Scrim、Close、Footer Action | `DialogSurface`、Showcase 打开态快照         | 已采用 HeroUI Dialog/Focus 管理并治理完整 Surface                        |
| [Notification](https://react-demo.tailadmin.com/notifications)  | Announcement、Toast、语义通知、Dismiss 与操作层级             | `NotificationCard`、`AlertBanner`、Showcase  | 已建立静态通知权威；全局 Toast 等真实需求出现后再扩展                    |
| [Pagination](https://react-demo.tailadmin.com/pagination)       | Text/Icon、Current、Disabled、Ellipsis                        | 未来分页数据场景                             | 已复核；与真实数据契约一起引入，禁止静态假分页                           |
| [Popovers](https://react-demo.tailadmin.com/popovers)           | 四方向、带 Button/Link、打开层级和内容宽度                    | `PopoverCard`、Showcase 打开态快照           | 已采用 HeroUI Popover；位置由 Overlay 决策                               |
| [Progressbar](https://react-demo.tailadmin.com/progress-bar)    | Size、Inside/Outside Label、确定进度                          | `ProgressMeter`、状态页面                    | 已有内部契约；进度值和文本必须保持同义                                   |
| [Ribbons](https://react-demo.tailadmin.com/ribbons)             | 角标与容器关系、Hover、Filled                                 | Feature Composition                          | 已复核；Badge 能表达时不新增 Ribbon                                      |
| [Spinners](https://react-demo.tailadmin.com/spinners)           | 多种 Loading 表达、按钮内 Spinner                             | `Action loading`、`Skeleton`、`StateSurface` | Loading 按作用域选择，不堆叠多个指示器                                   |
| [Tabs](https://react-demo.tailadmin.com/tabs)                   | Filled/Underline/Icon/Badge/Vertical、Selected                | `TabsView`、Showcase 状态组合                | 保持 HeroUI Primary Tabs 原有结构与内部留隙；由父 Surface 提供外部内边距 |
| [Tooltips](https://react-demo.tailadmin.com/tooltips)           | Light/Dark、方向、Arrow、Hover/Focus                          | `TooltipAction`、Showcase 打开态快照         | 已采用 HeroUI Tooltip；同时支持键盘 Focus 与悬停                         |
| [Videos](https://react-demo.tailadmin.com/videos)               | 16:9、4:3、21:9、1:1 比例                                     | Feature Composition                          | 以内容比例契约实现，不新增播放器 Wrapper                                 |

## 4. 内部 Showcase 权威范围

`/showcase` 是以下能力的项目级当前权威：

- Button：Primary、Secondary、Quiet、Danger、Small、Loading、Disabled。
- Alert：Success、Warning、长文本和可选操作。
- Badge：Neutral、Success、Warning、Danger、Info，Soft/Solid 与尺寸变化。
- Card：Elevated、Outlined、Embedded 的层级、Padding、动作与嵌套规则。
- Dropdown：Trigger、Icon Item、Disabled、Danger、打开层、Focus 与 Escape。
- Modal：Scrim、Header、Close、正文、Footer、表单、Focus Trap 与 Escape。
- Form Control：Default、Hint、Error、Disabled、Selected，以及 Select、Combobox、DatePicker Popup。
- Overlay：Menu、Popover、Tooltip、DatePicker、Command、Dialog、Drawer 的完整打开态。
- Notification：标题、说明、Dismiss、一主一次操作层级。

业务页面不得创造与上述权威冲突的 Radius、Shadow、控件高度、语义色或 Overlay Surface。合理差异通过已记录的 Variant、Size、Tone、State 与 Composition 表达。

## 5. 复核触发器

出现任一情况时，必须重新打开对应 TailAdmin UI Element，并在变更说明中记录对照结果：

- 新增或修改公共 Button、Alert、Badge、Card、Dropdown、Modal、Form Control、Notification 或 Overlay。
- 修改 Typography、Density、Control Height、Radius、Border、Shadow、Semantic Color、Focus Ring 或 Motion Token。
- 新增 HeroUI 组件、升级 HeroUI/Tailwind、改变 Portal/Overlay 装配方式。
- 视觉回归显示组件族之间的间距、密度、圆角、阴影或状态表达开始分叉。
- 业务页面提出内部 Design System 尚未覆盖的基础能力。

复核步骤固定为：关闭态 → Hover/Focus/Active/Selected → Disabled/Loading/Error → 打开态与 Escape/焦点返回 → Light/Dark → 中文/英文长文本 → 窄屏/桌面/超宽屏。外部参考发生变化时，只更新本矩阵中的观察结论；是否改变内部规范必须通过 Showcase 和视觉回归验证。
