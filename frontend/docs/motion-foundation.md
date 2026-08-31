# Motion Foundation 与语义动效分层

本文件是 `/frontend` Motion（动效）主题的唯一当前权威文档。动效参数、分层归属、容器目录与豁免策略都以此为准；变更记录（如 [096](changes/096-motion-foundation/README.md)）只作为历史证据，不构成第二套现行规范。

## 1. 核心模型：两层

- **Motion Foundation 管"怎么动"**：`packages/design-system` 的语义 Token、`motion.css` 配方单文件与 Reduced Motion Policy。
- **Semantic Transition 管"为什么动、什么时候动"**：语义容器（如 `PageTransition`）声明交互含义，底层映射具体 Motion 实现。

约束：页面声明语义，不声明动画参数；不得建立承担 Layout、Loading、Presence、Navigation 与 Overlay 的万能动画容器。

## 2. 动效四分类与归属矩阵

| 类别                             | 例子                                                 | 生命周期来源                                    | 归属                                       | 规则                                                                 |
| -------------------------------- | ---------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| A. Component State Motion        | hover/pressed/switch/chevron/进度                    | 组件自身状态                                    | UI Element（ui-adapter）                   | 时长归 `--motion-duration-control`（默认 `transition-*` 已统一指向） |
| B. Presence Motion               | Alert 出现、Toast 消失、列表项增减、Empty↔数据       | mount→enter→stable→exit→unmount                 | 语义容器 + （需要时才引入的）Presence 原语 | 以交互语义命名，不按 fade/slide/scale 命名；用例先行                 |
| C. Overlay Motion                | Modal/Dialog/Drawer/Dropdown/Popover/Tooltip/Command | Portal/Focus/Keyboard/Scroll Lock/Overlay Stack | HeroUI → ui-adapter 内部契约               | **禁止在 Overlay 外再套动画容器**（生命周 期打架风险）               |
| D. Navigation/Content Transition | 页面切换、同路由内容切换                             | Router/Navigation                               | Host 提供生命周期 → Layout 层语义容器消费  | PageTransition 现役；未来容器按 §4 登记                              |

## 3. Motion Foundation（design-system）

### 3.1 Token

基础档位（数值单一权威，`tokens.css`）：

```text
--motion-duration-fast / standard / slow   = 120ms / 180ms / 240ms
--ease-product                             = cubic-bezier(0.2, 0.8, 0.2, 1)
```

用途语义层（页面与组件按用途引用，不按数值引用）：

```text
--motion-duration-control   → fast    组件自身状态动效（默认 transition-* 时长）
--motion-duration-feedback  → standard 反馈/异步状态动效（消费者：未来 FeedbackTransition）
--motion-duration-page      → slow    页面级转场
--motion-distance-page      → 3.75rem  页面转场滑动位移
```

`@theme` 提供：`--default-transition-duration`（= control）、`--transition-duration-*`（含 page）→ `duration-*` utility。

拒绝项（无消费方不预建）：`--motion-duration-overlay`（HeroUI 内部动画不受项目 Token 控制）、第二缓动曲线（enter/exit 无真实用例）。

### 3.2 配方治理（motion.css 单文件）

- 所有 CSS 动效配方（keyframes 与 `::view-transition-*` 规则）集中在本文件，分节编号，顶部注释登记消费方与 reduced-motion 覆盖。
- **配方登记表**：新增配方前必须先在文件内登记并同步本文档与 Reduced Motion 覆盖。
- 当前配方：`page-fade-out/in`（转场淡入淡出快照）、`page-slide-out/in`（nav-forward 方向滑动）、app-header/app-sidebar 锚定抑制。

### 3.3 退役与重建纪律

- JS 侧动画时长：当前无调用方（`productMotion` 已于 096 退役）。未来出现 JS 动画需求时，在实现任务中从 `tokens.css` 语义 Token 导出 JS 常量并接线单测，不得先建导出再等用例。

## 4. Semantic Transition 容器目录

| 语义容器                                   | 生命周期来源                                     | 状态                            | 触发条件                                                                                    |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `PageTransition`（=ScreenTransition 语义） | Next `transitionTypes` + React ViewTransition    | 现役（`apps/web/src/layouts/`） | —                                                                                           |
| `AsyncContentTransition`                   | 数据请求状态 initial/refresh/blocking/background | FUTURE                          | reference `sceneMode`/真实数据页迁移                                                        |
| `DisclosureTransition`（折叠/展开）        | 展开状态                                         | FUTURE                          | 折叠面板需求；复用 HeroUI `./disclosure`/`./accordion`，经 ui-adapter 包装，不自研 Collapse |
| `FeedbackTransition`（Toast/Inline Alert） | 反馈生命周期                                     | FUTURE                          | FeedbackProvider 强化                                                                       |
| `ContentSwapTransition`（Tabs/筛选切换）   | 同路由内容切换                                   | FUTURE                          | Tabs/筛选联动需求（对应 same-route crossfade 模式）                                         |

未来容器实现原则：① 真实用例与验收先行；② 不暴露 duration/easing prop（只暴露用途语义或速度档）；③ 动画层与空间层分离；④ 实现时补齐中断测试矩阵（§7）；⑤ 需要 JS 生命周期协调（mount/enter/stable/exit/unmount）时，才在同一任务中引入 ui-adapter 的 Presence/Transition 原语（数量 ≤2，只服务语义容器，不直接给业务页）。

## 5. Host 生命周期

- 现状：Next（Host/Router）通过 `transitionTypes` 提供导航类型（生命周期信息），`PageTransition`（Layout 层）只消费并映射视觉语义；Host 不写 CSS 动画，Layout 层不依赖 Router 私有实现。
- 选择标准：只要 React `<ViewTransition>` 集成满足需求，不引入手工 `startViewTransition` 协调器；若未来需要共享元素 morph 或导航 pending 全局指示等能力，先回研究门禁评估协调器形态。

## 6. Layout Contract（动画层与空间层分离）

- 现役 `PageTransition` 无 DOM 外壳（React ViewTransition），不控制高度/滚动/定位，天然满足。
- 未来自研动画容器必须显式分离：`ScreenViewport`（决定空间与滚动）→ `ScreenTransitionLayer`（只做生命周期与视觉过渡）→ `Screen`（内容）。
- 禁止形态：动画容器隐式设置 position/height/overflow/transform 影响 sticky、fixed、100%、虚拟滚动容器。

## 7. Reduced Motion Policy（单一实现）

- 常规动画：`tokens.css` 全局块（0.01ms、iteration 1）。
- 转场伪元素：`motion.css` 专属块（同特异性、源顺序靠后，0.01ms，不使用 important 声明）。
- Tailwind 变体：`motion-reduce:`。
- 规则：Feature/Page 不得各自 `matchMedia`；新配方必须进入 Policy 覆盖范围才可合入（配方登记表强制项）。
- 分级策略：大位移 → 去掉；缩放 → 去掉/减弱；长时转场 → 缩短；必要状态反馈（loading/进度）→ 保留。

## 8. 验证矩阵（未来 /motion 参考页规格）

首个语义容器落地时建立 `/motion` 参考/验证页（不是动画展览馆），必测：

1. 快速连续切换、Enter 未完成再次 Exit、Exit 未完成重新 Enter（动画中断）。
2. 长内容/短内容/不同高度切换（Layout Contract）。
3. 滚动页面、窄屏、Dark、Reduced Motion。
4. 键盘导航与嵌套 Overlay 组合。

## 9. 新增动效判定流程

1. 查本文件配方登记表与容器目录：该语义是否已存在（含 HeroUI 浮层能力、Skeleton/BusyIndicator、PageTransition）。
2. 判定分类（§2 四类）与归属层。
3. 只引用语义 Token；补 Policy 覆盖；登记配方表。
4. 公共新能力同步 `/ui-elements` 或文档权威；局部能力留在 Feature。
5. 无真实用例不新建原语/容器（用例先行）。
