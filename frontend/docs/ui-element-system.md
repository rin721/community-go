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
- `packages/design-system` 负责颜色、尺寸、空间、圆角、阴影和动效语义。
- `packages/ui-adapter` 把底层能力收敛为项目 UI Element；不得暴露 HeroUI props 或 DOM。
- Composite 只组合已有 Element 与 Layout，不重新定义控件、浮层或状态视觉。
- Feature 拥有业务文案和状态选择，不创建第二套基础组件。

## 2. 当前分类

| Family                | 稳定语义                     | 当前 Element                                                                                  | 不应混入                     |
| --------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------- |
| Actions               | 发起命令或提交               | `Action`、`IconAction`                                                                        | 导航链接、值选择             |
| Form Controls         | 输入、编辑或选择表单值       | `TextField`、`TextAreaField`、`SelectField`、`ComboField`、`DatePickerField`                  | Action Menu、Navigation Menu |
| Selection             | 独立布尔或集合选择           | `CheckboxField`、`SwitchField`                                                                | 用 Switch 代替即时动作       |
| Navigation            | 页面或视图切换               | `TabsView`、Breadcrumb、Shell Navigation                                                      | 表单值提交                   |
| Feedback              | 解释操作结果或风险           | `AlertBanner`、`NotificationCard`                                                             | 长期数据状态标签             |
| Status                | 紧凑表达对象状态             | `Badge`、`StatusPill`、`StateSurface`、`ProgressMeter`                                        | 交互按钮                     |
| Data Display          | 展示结构化数据               | `DataTable`                                                                                   | 表单输入与操作菜单           |
| Overlay / Floating UI | 在普通页面层之上承载短期交互 | `MenuButton`、`PopoverCard`、`TooltipAction`、`DialogSurface`、`DrawerSurface`、`CommandMenu` | 普通 Card / Panel 外壳       |
| Layout Primitives     | 建立页面和 Surface 空间关系  | `Panel`、Page Layout Contract                                                                 | 业务状态和数据请求           |

Media 只有出现真实产品场景后才建立稳定 Element；图片、视频比例等局部内容布局默认留在 Feature Composition。

## 3. Form Control Family

所有 Form Control 共享以下不变量：

- Control Height、Typography、Background、Border、Radius、Placeholder、Focus、Disabled 和 Invalid 来自同一语义样式。
- Label、Description 与 Validation Message 使用同一层级；Error 替代 Hint，不同时制造两条互相竞争的说明。
- Text Input、Textarea、Select Trigger、ComboBox InputGroup 与 DateField Group 在同一密度下必须可以并排比较。
- 复合控件只允许最外层 InputGroup 负责 Border、Background、Radius 和 Focus Surface；内部 `Input` 必须保持透明、无边框的 Primitive 形态。
- `fullWidth` 是表单列中的稳定默认；局部宽度由布局容器控制，不由 Popup 内容反向决定。

当前语义尺寸由 `--spacing-control` 管理，Option 触控高度由 `--spacing-option` 管理。业务页面不得复制对应数值。

## 4. Anchored Overlay

Anchored Overlay 负责 Trigger 与 Popup 的空间关系，定位和碰撞继续由 HeroUI 管理。项目只固定产品语义：

| Width Strategy  | 语义                                       | 当前使用                       |
| --------------- | ------------------------------------------ | ------------------------------ |
| `match-trigger` | Popup 宽度等于 Trigger，表单列保持几何连续 | `SelectField`、`ComboField`    |
| `min-trigger`   | Popup 不窄于 Trigger，允许内容扩张         | 预留；出现真实复用场景前不公开 |
| `content`       | Popup 根据操作或说明内容决定宽度           | Action Menu、Popover、Tooltip  |

普通 Select 与 Combobox 固定使用 `match-trigger`。它们依赖 HeroUI 提供的 `--trigger-width` 与 Portal/Collision，不把 Popup 放入普通文档流，也不通过业务页宽度补丁修正。

Listbox 的滚动属于列表内部责任：Overlay Surface 提供外壳，Listbox 负责 Maximum Height、Overflow 和 Option 排列。

## 5. Overlay Surface 与 Option State

`ui-overlay-surface` 是 Dropdown、Select、Combobox、Popover、DatePicker、Dialog、Drawer 和 Command 共用的 Surface 语义，统一 Background、Border、Radius、Shadow 和文字颜色。不同 Overlay 只决定内容 Padding、宽度策略和结构，不复制一套 Surface。

`ui-option` 是 Listbox 与 Menu Item 的共享状态基线：

- Default：普通文字与透明背景。
- Hover / Keyboard Focus：使用低强调 Surface，表达当前指向位置。
- Selected：使用 Brand Soft、Brand 文字和更高字重，表达持久选择。
- Disabled：降低强调且不可操作。
- Danger：保留 Option 的尺寸与 Focus 规则，只替换语义色。

Hover/Focus 与 Selected 不得合并为同一种状态；Selected 不能只依靠 Hover 才可见。

## 6. Composition Rules

- 一个视觉 Surface 只能由一层负责 Border、Radius、Shadow、Background 和外部 Padding。
- 父 Surface 通过内边距拉开子 Element；不得为了解决贴边问题改写子组件自身 Variant。
- 已有外壳进入 Panel、Dialog、Drawer 或 Form 时，应使用 Primitive、Embedded 或 Slot，而不是完整组件套完整组件。
- Scroll Container 由实际拥有滚动内容的一层负责；父子不能重复声明滚动和固定高度。
- Page Header、Toolbar、Filter Bar、Section、Split View 与 Footer Actions 通过 Layout Contract 组合，不在每个 Page 重写同类骨架。

## 7. Showcase 与质量证据

- `/showcase` 按 Family 并排暴露 Variant、Density、Disabled、Invalid、Selected、长文本、Locale 和窄屏漂移。
- Select、Combobox、Dropdown、Popover、Tooltip、DatePicker、Command、Dialog 与 Drawer 必须保留打开态视觉基线。
- Form Selection 的视觉回归必须断言 Popup 使用 Trigger 宽度且 Listbox 自己滚动。
- 关键 Overlay 必须验证 Escape、焦点返回、Keyboard Navigation、ARIA 与 Axe WCAG AA。
- `/reference` 与 `/reference/form` 是 Pattern Reference，用于验证 Element 进入 Toolbar、Filter、Table、Master-Detail、Split View 和复杂 Form 后仍保持契约。
- `architecture:check` 禁止 Feature 使用原生表单控件、直接消费 Adapter 内部 `ui-*` Element 样式，或在 Design Token 权威文件之外声明硬编码颜色。

## 8. 演进规则

新增基础能力前按顺序判断：

1. 已有 Element 是否已经表达该语义。
2. 是否只是已有 Element 的稳定 Variant 或 Density。
3. 是否应由 Composition、Slot、Primitive 或 Feature 局部结构完成。
4. 只有存在跨 Feature 的独立语义、状态和验证价值时才新增 UI Element。

公共 Token、Form Control、Overlay Surface、Option、Layout 或 Adapter 改动必须同步检查全部调用方、Showcase 打开态、Pattern Reference、Dark Mode、Locale 扩张、窄屏和 Accessibility。外部成熟产品只用于复核设计规律，内部权威始终是本文、Semantic Token、UI Adapter 与可运行回归证据。
