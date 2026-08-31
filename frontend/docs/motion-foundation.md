# Motion Foundation 与语义动效分层

本文件是 `/frontend` Motion（动效）主题的唯一当前权威文档。动效参数、分层归属、容器目录、Recipe、Policy 与豁免策略都以此为准；变更记录（如 [096](changes/096-motion-foundation/README.md)、[097](changes/097-motion-governance/README.md)）只作为历史证据，不构成第二套现行规范。

## 1. 核心模型：三层治理

动效治理分三层，业务代码只接触最上层：

```text
Motion Policy    管"允许动什么"（用户环境 + 开发期 Override，见 §8）
Motion Recipe    管"语义行为怎么动"（Token 之上的语义配方，见 §7）
Semantic Component 管"为什么动/何时动"（页面声明语义，见 §5）
```

约束：页面声明语义，不声明动画参数；不得建立承担 Layout、Loading、Presence、Navigation 与 Overlay 的万能动画容器；Feature 不直接选择 Recipe 或实现型动画。

## 2. 三层 Motion 模型

动效可按生命周期来源分为三个独立层级，它们可能作用于同一 Section，但**必须是不同组件、职责不可混合**：

| 层级                     | 职责                                                | 生命周期来源         | 表现强度               | 状态                   |
| ------------------------ | --------------------------------------------------- | -------------------- | ---------------------- | ---------------------- |
| Screen Transition        | Navigation continuity（"已进入另一个 Screen"）      | Router/Navigation    | 轻：opacity + 极小位移 | 现役（PageTransition） |
| Viewport Reveal          | Spatial discovery（Section 首次进入可视区）         | IntersectionObserver | 克制，reveal-once      | 登记（FUTURE-097-001） |
| Async Content Transition | Data readiness continuity（数据就绪后内容平滑切换） | 数据请求状态         | 短 fade + 极小 rise    | 现役（AsyncRegion）    |

页面转场**不承担**"该 Screen 内容已加载完毕"的语义；数据加载由各 Region 的 AsyncContent 独立处理。视觉层级：

```text
Navigation → 轻 Screen Transition → Page Shell 立即稳定
  → Above-fold Region 立即呈现（最多接受 Screen Transition 的轻微效果）
  → Below-fold Region 首次进入视口时 Reveal-once
  → 区域内数据加载走 AsyncContent（Skeleton → crossfade → Content）
```

## 3. 动效四分类与归属矩阵

| 类别                             | 例子                                                 | 生命周期来源                                    | 归属                                         | 规则                                                                 |
| -------------------------------- | ---------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| A. Component State Motion        | hover/pressed/switch/chevron/进度                    | 组件自身状态                                    | UI Element（ui-adapter）                     | 时长归 `--motion-duration-control`（默认 `transition-*` 已统一指向） |
| B. Presence Motion               | Alert 出现、Toast 消失、列表项增减、Empty↔数据       | mount→enter→stable→exit→unmount                 | 语义容器 + （需要时才引入的）Presence 原语   | 以交互语义命名，不按 fade/slide/scale 命名；用例先行                 |
| C. Overlay Motion                | Modal/Dialog/Drawer/Dropdown/Popover/Tooltip/Command | Portal/Focus/Keyboard/Scroll Lock/Overlay Stack | HeroUI → ui-adapter 内部契约                 | **禁止在 Overlay 外再套动画容器**（生命周期打架风险）                |
| D. Navigation/Content Transition | 页面切换、同路由内容切换、异步数据切换               | Router / 数据状态                               | Host 提供生命周期 → Layout/Semantic 容器消费 | 见 §2 三层模型                                                       |

## 4. Motion Foundation（design-system）

### 4.1 Token

基础档位（数值单一权威，`tokens.css`）：

```text
--motion-duration-fast / standard / slow   = 120ms / 180ms / 240ms
--ease-product                             = cubic-bezier(0.2, 0.8, 0.2, 1)
--motion-distance-page                     = 3.75rem （页面转场滑动位移；轻转场 1rem 尝试已回退，见 changes/097）
--motion-distance-reveal                   = 0.5rem （内容/区域进场抬升位移）
```

用途语义层（页面与组件按用途引用，不按数值引用）：

```text
--motion-duration-control   → fast    组件自身状态动效（默认 transition-* 时长）
--motion-duration-feedback  → standard 反馈/异步状态动效（消费者：未来 FeedbackTransition）
--motion-duration-page      → slow    页面级转场
```

`@theme` 提供：`--default-transition-duration`（= control）、`--transition-duration-*`（含 page）→ `duration-*` utility。

拒绝项（无消费方不预建）：`--motion-duration-overlay`（HeroUI 内部动画不受项目 Token 控制）、第二缓动曲线（enter/exit 无真实用例）。

### 4.2 配方治理（motion.css 单文件）

- 所有 CSS 动效配方（keyframes 与 `::view-transition-*` 规则）集中在本文件，分节编号，顶部注释登记消费方与 reduced-motion 覆盖。
- **配方登记表**：新增配方前必须先在文件内登记并同步本文档与 Reduced Motion 覆盖。
- 当前配方：`screen.enter/screen.exit`（页面转场，含锚定抑制）、`content.enter`（AsyncRegion 内容进场），均标注 `recipe:` 命名并经 reduced-motion 覆盖。

### 4.3 退役与重建纪律

- JS 侧动画时长：当前无调用方（`productMotion` 已于 096 退役）。未来出现 JS 动画需求时，在实现任务中从 `tokens.css` 语义 Token 导出 JS 常量并接线单测，不得先建导出再等用例。

## 5. Semantic Transition 容器目录

| 语义容器                                      | 生命周期来源                                  | 状态                             | 触发条件                                                                                    |
| --------------------------------------------- | --------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| `PageTransition`（=ScreenTransition 语义）    | Next `transitionTypes` + React ViewTransition | 现役（`apps/web/src/layouts/`）  | —                                                                                           |
| `AsyncRegion`（=AsyncContentTransition 语义） | 数据请求状态 loading/error/empty/ready        | 现役（ui-adapter，组合 Pattern） | 消费方：reference `sceneMode`；真实数据页接入时重验                                         |
| `ViewportReveal`                              | IntersectionObserver，reveal-once             | FUTURE                           | below-fold 长内容页/仪表盘出现                                                              |
| `DisclosureTransition`（折叠/展开）           | 展开状态                                      | FUTURE                           | 折叠面板需求；复用 HeroUI `./disclosure`/`./accordion`，经 ui-adapter 包装，不自研 Collapse |
| `FeedbackTransition`（Toast/Inline Alert）    | 反馈生命周期                                  | FUTURE                           | FeedbackProvider 强化                                                                       |
| `ContentSwapTransition`（Tabs/筛选切换）      | 同路由内容切换                                | FUTURE                           | Tabs/筛选联动需求（对应 same-route crossfade 模式）                                         |

未来容器实现原则：① 真实用例与验收先行；② 不暴露 duration/easing prop（只暴露用途语义或速度档）；③ 动画层与空间层分离；④ 实现时补齐中断测试矩阵（§16）；⑤ 需要 JS 生命周期协调（mount/enter/stable/exit/unmount）时，才在同一任务中引入 ui-adapter 的 Presence 原语（数量 ≤2，只服务语义容器，不直接给业务页）。

## 6. Motion Region

- Region = 具有视觉完整性的页面区块（如 PageHeader / SummarySection / DataSection），**只有 Region 有资格参与页面级 Reveal**。
- 禁止逐 UI Element / 逐表格行进场动画；stagger 仅限 3–6 个同类卡片且克制。
- 大容器负责大生命周期；小型资源组件（图片等）负责自身资源 readiness（见 §10）。

## 7. Motion Recipe 层

- Recipe 描述完整语义行为（screen.enter、content.enter 等），位于 Token 之上：Recipe 引用 Token，被 Semantic Component 绑定。
- **Recipe 属于组件实现**：`PageTransition` 只绑定 screen recipe，`AsyncRegion` 只绑定 content recipe；Feature 不选择 Recipe（禁止 `<Card motion="screen">` 式用法）。
- 变更观感 = 改 Recipe/Token（如 `--motion-distance-page`），几十个页面无需修改。注：097 的轻转场尝试（1rem）因本地环境溢出用例时序问题回退为 3.75rem，回退本身也是单点 Token 变更。

## 8. Motion Policy 两层模型

- **User Environment Policy**：`prefers-reduced-motion` 分级策略（§14 单一实现），这是 Accessibility，Feature/Page 不得各自判断。
- **Developer Override（Motion Inspector，开发期）**：模式 System/Full/Reduced/Off、分项开关（Screen/Reveal/Async/Overlay）、Slow Motion 1×/2×/4×；通过 AppShell/MotionPolicy 统一注入，**不得进入业务组件 props**；生产环境默认 system。实现登记触发条件：≥2 个 Motion 类别组件共存（现仅 Screen+Async 两层，Inspector 部分能力可用时立项）。
- 解析顺序：Developer Override + User Environment Policy + Recipe → Resolved Motion。

## 9. Motion 决策树（新增动效必走）

接到"给 XXX 加动画"时，先回答**变化来自什么生命周期**，再实现：

```text
Route navigation?              → ScreenTransition（PageTransition）
Async state (loading/ready)?   → AsyncRegion（loading/error/empty/ready 层）
First viewport discovery?      → ViewportReveal（FUTURE，reveal-once、Region 边界）
Mount/unmount?                 → Presence（FUTURE）
Disclosure (展开/折叠)?        → Disclosure（FUTURE，HeroUI 能力）
Overlay (Modal/Drawer/...)?    → UI Adapter Overlay 内部（禁止外包动画容器）
Feedback (Toast/Alert)?        → Feedback 组件
Component interaction?         → 组件自身状态动效（duration-control）
```

禁止直接写 CSS 动画类或选择 fade/slide/scale。

## 10. Async Content 规范

- AsyncRegion 只处理"数据是否 Ready"；"是否进入视口"由 ViewportReveal 处理，两维度独立。
- Loading 四语义（未来状态模型的统一口径）：
  - initial：首次无数据 → Skeleton 替换内容；
  - refresh：已有数据 → 保留内容 + 局部 Pending（禁止整块消失换 Skeleton）；
  - blocking：关键提交/初始化 → 才允许 Loading Overlay；
  - background：静默刷新 → 不打扰。
- 大容器不承载资源 loading：图片等资源组件自己管理 reserved layout / placeholder / decode / crossfade（ImageReady，FUTURE-097-005）。
- 禁止"页面加载完再统一显示"（Wait-all→Reveal-all）：各 Region 独立 ready、先就绪先切换（Progressive Rendering + Progressive Reveal）。

## 11. 克制清单（Anti-patterns）

- 列表/表格逐行弹入。
- 视口 presence 滚动动画（进入动画、离开动画、重进再动画）——后台应 reveal-once。
- 每个 UI Element 都套动画容器。
- Wait-all→Reveal-all 整页统一淡入。
- Modal/Drawer 外再套 `<Fade>` 等动画容器。

## 12. Host 生命周期

- 现状：Next（Host/Router）通过 `transitionTypes` 提供导航类型（生命周期信息），`PageTransition`（Layout 层）只消费并映射视觉语义；Host 不写 CSS 动画，Layout 层不依赖 Router 私有实现。
- 选择标准：只要 React `<ViewTransition>` 集成满足需求，不引入手工 `startViewTransition` 协调器；若未来需要共享元素 morph 或导航 pending 全局指示等能力，先回研究门禁评估协调器形态。

## 13. Layout Contract（动画层与空间层分离）

- 现役 `PageTransition` 无 DOM 外壳（React ViewTransition），不控制高度/滚动/定位，天然满足。
- 未来自研动画容器必须显式分离：`ScreenViewport`（决定空间与滚动）→ `ScreenTransitionLayer`（只做生命周期与视觉过渡）→ `Screen`（内容）。
- 禁止形态：动画容器隐式设置 position/height/overflow/transform 影响 sticky、fixed、100%、虚拟滚动容器。
- AsyncRegion 的高度由当前可见层决定（不做双占位高度动画）；旧层淡出的 exit 主持属于 Presence 职责，登记不实现。

## 14. Reduced Motion Policy（单一实现）

- 常规动画：`tokens.css` 全局块（0.01ms、iteration 1）。
- 转场伪元素：`motion.css` 专属块（同特异性、源顺序靠后，0.01ms，不使用 important 声明）。
- 普通元素配方（content.enter 等）：`motion.css` policy 块覆盖。
- Tailwind 变体：`motion-reduce:`。
- 规则：Feature/Page 不得各自 `matchMedia`；新配方必须进入 Policy 覆盖范围才可合入（配方登记表强制项）。
- 分级策略：大位移 → 去掉；缩放 → 去掉/减弱；长时转场 → 缩短；必要状态反馈（loading/进度）→ 保留。

## 15. 新增动效判定流程

1. 查本文件决策树（§9）与配方登记表：该生命周期是否已有语义组件/配方（含 HeroUI 浮层能力、Skeleton/BusyIndicator、PageTransition、AsyncRegion）。
2. 判定分类（§3 四类）与归属层。
3. 只引用语义 Token；补 Policy 覆盖；登记配方表。
4. 公共新能力同步 `/ui-elements` 或文档权威；局部能力留在 Feature。
5. 无真实用例不新建原语/容器（用例先行）。

## 16. 验证矩阵（未来 /motion 参考页规格）

首个动效组合场景落地时建立 `/motion` 参考/验证页（不是动画展览馆），必测：

1. 快速连续切换、Enter 未完成再次 Exit、Exit 未完成重新 Enter（动画中断）。
2. 长内容/短内容/不同高度切换（Layout Contract）。
3. 滚动页面、窄屏、Dark、Reduced Motion。
4. 键盘导航与嵌套 Overlay 组合。

## 17. 当前实现对照（现状即权威）

| 三层/治理项         | 当前实现                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Screen Transition   | `PageTransition`（apps/web/src/layouts）+ `motion.css` screen.enter/screen.exit 配方       |
| Async Content       | `AsyncRegion`（packages/ui-adapter/src/async-region.tsx）+ `motion.css` content.enter 配方 |
| Viewport Reveal     | 未实现（登记）                                                                             |
| Recipe 命名与登记表 | `motion.css` 配方块 `recipe:` 标注                                                         |
| Policy              | tokens.css + motion.css reduced-motion 单一实现；Developer Override 登记                   |
| 决策树              | §9（AGENTS 4.2 引用本文件）                                                                |
