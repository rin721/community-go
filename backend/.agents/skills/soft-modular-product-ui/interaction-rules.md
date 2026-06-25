# Interaction Rules

交互应轻、短、明确。所有状态都必须可见、可键盘触达，并能在 reduced motion 下安全降级。

## Hover
- 可点击卡片：标题或图标使用主色，阴影从 `shadow.none` 到 `shadow.card.hover`，不超过 250ms。
- 图标按钮：使用浅色叠层或主色弱背景，图标颜色轻微增强。
- 文本链接：使用主色与下划线或底线偏移，不只改变颜色。
- 禁止大幅缩放、旋转或连续闪烁。

## Active
- 按钮 active 使用 pressed 色或 1px translateY。
- 导航 active 使用主色、短下划线、圆形底或徽标表达当前状态。
- 卡片 active 不应改变布局尺寸。
- active 反馈时长 100-180ms。

## Focus
- 所有可交互元素必须有 `:focus-visible`。
- focus ring 使用 2-3px 主色或主色弱化态，外扩 2px。
- focus 不应被 `outline: none` 删除。
- 键盘 Tab 顺序必须与视觉顺序一致。

## Disabled
- 禁用态使用 `opacity.disabled`，并保留文本可读性。
- 禁用按钮不可触发 hover、active 和提交。
- 禁用原因应通过帮助文本、tooltip 或上下文说明呈现。
- 不只依赖灰色表达不可用状态。

## Loading
- 页面级 loading 使用顶部细进度条或局部骨架，不遮挡已可读内容。
- 按钮 loading 保留宽度，显示 spinner 或文本“处理中”。
- 卡片列表 loading 使用固定比例 skeleton，避免布局跳动。
- 超过 5 秒的 loading 需要可读状态说明。

## Error
- 错误状态使用 `color.state.danger`、图标和文本说明。
- 表单错误文本必须与输入框关联。
- 错误提示应说明如何修正，不输出模糊失败文案。
- 错误 toast 不应自动过快消失，用户需要时间阅读。

## Success
- 成功状态使用 `color.state.success`、明确完成文案和可选下一步。
- 表单成功后保留上下文，不突然清空用户输入，除非任务明确需要。
- 成功 toast 可自动消失，但必须可手动关闭。

## Empty
- 空状态包含中性图标或轻插图、短标题、1 行说明、可选 CTA。
- 空状态不责备用户，不使用夸张情绪。
- 如果下一步明确，应提供主操作。
- 空列表高度应稳定，避免页面塌陷。

## Scroll
- 长页面使用自然滚动，不强制滚动劫持。
- 固定导航应避免遮挡锚点标题，使用 `scroll-margin-top`。
- 横向标签栏可滚动，但当前项必须可见。
- 移动端底部导航不遮挡最后一个内容块，底部留出安全区。

## Transition
- 默认 transition：`motion.duration.normal` + `motion.easing.standard`。
- 颜色和填充变化使用 `motion.duration.instant` 或 `motion.duration.fast`。
- 抽屉和浮层使用 `motion.duration.slow`，但不超过 420ms。
- 同一组件内不要混用超过 2 种 easing。

## Micro-interaction
- 导航选中可用短下划线滑动或淡入。
- 标签选中可显示 check 图标或主色徽标。
- 图标按钮 hover 可轻微改变背景和图标色。
- 卡片 hover 可以显示轻遮罩和操作图标。
- 微交互只服务状态反馈，不承担主要信息表达。

## Motion Duration
- 颜色变化：100ms。
- hover 与 active：180ms。
- 普通组件过渡：250ms。
- 抽屉、modal、页面局部切换：300-420ms。
- 骨架闪动周期：1200-1600ms，reduced motion 下关闭。

## Easing
- 默认使用 `cubic-bezier(0.19, 1, 0.22, 1)`。
- 强调浮层可使用 `cubic-bezier(0.16, 1, 0.3, 1)`。
- 禁止弹性过强的 bounce。
- 数据变化不使用戏剧化 easing。

## Reduced Motion
- 使用 `@media (prefers-reduced-motion: reduce)`。
- 关闭非必要位移、视差、持续循环和骨架闪动。
- 保留颜色、边框、文本等非运动反馈。
- 抽屉和 modal 直接淡入淡出或无动画。

## Keyboard Interaction
- Tab 顺序与视觉流一致。
- Enter 激活链接和按钮。
- Space 激活按钮、checkbox、switch。
- Esc 关闭 modal、drawer、popover。
- Arrow keys 可用于 tablist、radio group、菜单组。
- 焦点不得被困在不可见区域。

## Touch Interaction
- 触控目标至少 44x44px。
- 底部导航避开系统安全区。
- 长按不作为唯一操作方式。
- 滑动抽屉必须同时提供可点击关闭按钮。
- 移动端 hover 效果不得作为必要反馈。
