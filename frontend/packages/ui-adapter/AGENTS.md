# UI Adapter 开发约束

- 本目录是唯一允许直接导入 `@heroui/*` 的 TypeScript/CSS 边界。
- 只封装会被大量业务长期依赖、替换成本高的语义能力；不按 HeroUI 组件清单机械复制 API。
- 导出的 props 必须属于项目语义，禁止 `extends ComponentProps<typeof HeroComponent>` 让 HeroUI props 穿透。
- Adapter 负责第三方 API 映射、Design Token 映射、交互差异和 Accessibility；不得暴露 HeroUI DOM、slot 名或内部 class。
- Select、Combobox、Dropdown、Popover、Tooltip、Menu、DatePicker、Command、Dialog 与 Drawer 必须保留 HeroUI/React Aria 的 Popup、Overlay、Focus 与 ARIA 语义，不得退化成原生控件或自制浮层。
- 新 Variant 必须对应至少一个真实复用场景；单页视觉差异留在 Feature Composition。
- `TabsView` 是内容切换的公共视觉 owner，按三个正交维度扩展且不建立 icon/badge/vertical 业务 Variant：Visual Variant（`line`/`section`/`soft`，语义与选中指示矩阵见 `docs/ui-element-system.md` Navigation 条款）× Orientation（`horizontal`/`vertical`，vertical 不创建新 Variant、窄视口回退为横向可滚动）× Item Content（`label` + 受控 `icon?`/`badge?: number|string`，icon wrapper 的尺寸/颜色继承/aria-hidden 与 badge 的 Badge primitive 渲染由 TabsView 负责）。禁止暴露 HeroUI visual variant、禁止提供可覆盖 TabList 视觉职责的通用 className 逃生口，禁止 HeroUI 胶囊残留（rounded-3xl/h-8/vendor p-1 叠加），禁止页面级 CSS override；Tabs（内容切换）与 ToggleGroup（值/模式选择）语义不可互换。
- 新增或修改公共组件前，按 `frontend/docs/ui-visual-calibration.md` 进入 TailAdmin 对应 `UI Elements` 页面复核关闭态、交互态和打开态；只学习视觉规律，不复制源码、DOM、CSS 或具体数值。
- Button、Alert、Badge、Card、Dropdown、Modal、Form Control、Notification 和 Overlay 的最终规范必须同步进入 `/ui-elements` 对应 Family 页面，不得让业务页成为新的隐式权威。
- 组合场景优先提供 `embedded`、`inset`、slot 或 primitive 能力，避免成形组件重复叠加边框、圆角、阴影和 padding。
- 内部内容职责边界：外层交互组件（Action、ToggleItem、Radio/Checkbox option、Choice Card）拥有 surface/border/radius/selected/pressed；内部 indicator/icon/content 只拥有 geometry/alignment/foreground。禁止「成形组件内部再次出现成形小组件」（如 Button 内嵌 IconButton、ToggleItem 内第二层 item/chip surface、Radio indicator 双 dot）；icon/indicator wrapper 必须保持透明、无 border/radius/shadow、固定 semantic size、`aria-hidden`，并显式覆盖 vendor 默认方向/尺寸/伪元素（如 HeroUI radio/checkbox 的 `flex-col`、`.radio__indicator:empty::before`、`.button svg`/`.toggle-button svg` 尺寸）以免 vendor 视觉直达业务。
- 禁止在本目录新增业务文案、路由、数据请求、Host API 或领域状态。
