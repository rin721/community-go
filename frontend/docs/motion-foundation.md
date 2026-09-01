# Motion Foundation 与语义动效分层

本文件是 `/frontend` Motion 主题的唯一当前权威。历史变更记录只保存当时证据，不构成现行规范。

## 1. 治理模型

```text
Motion Policy      用户环境 + development override，决定是否允许某类动效
Motion Recipe      Design Token 之上的语义行为，决定如何呈现连续性
Semantic Component 绑定真实生命周期，决定为什么动、何时动
```

页面只声明业务状态，不填写 duration、easing、keyframes 或浏览器观察器。动画层不得改变高度、滚动容器、定位上下文或 Layout Contract。Overlay Enter/Exit 继续完全由 HeroUI 与 UI Adapter 主持。

## 2. 生命周期与所有权

| 生命周期                 | 当前组件                          | 所有权                              | 规则                                                                                                       |
| ------------------------ | --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Router / Suspense        | Host `RouteTransition`            | `apps/admin-web/src/host`           | `nav-forward` 使用 Admin screen recipe；无导航类型使用克制的 `content.enter`；hydration 不重复播放页面滑动 |
| 数据 readiness           | `AsyncRegion`、`AdminStateRegion` | Universal / Admin Surface           | initial 才替换 Skeleton；refresh 保留旧内容；background 静默                                               |
| 首次进入视口             | Host `ViewportReveal`             | Host 生命周期 + Admin reveal recipe | 仅显式 below-fold Region，单例 Observer，reveal-once                                                       |
| 同路由内容切换           | `ContentSwapTransition`           | UI Adapter                          | 使用稳定 `contentKey`；`TabsView` 默认接入；筛选刷新不使用它                                               |
| Inline Feedback Presence | `FeedbackPresence`                | UI Adapter                          | exit 期间立即退出辅助技术与交互树；支持快速反转；Toast 不接入                                              |
| 非 Avatar 图片 readiness | `ReadyImage`                      | UI Adapter                          | width/height 预留空间，load + decode 后 crossfade，error 保持尺寸                                          |
| Overlay                  | HeroUI compound lifecycle         | UI Adapter                          | 禁止再套 Presence 或页面动画容器                                                                           |

冷启动与路由挂起统一使用 `AdminPageLoadingSurface`。根 `loading.tsx` 与各路由 Suspense 都必须提供 `page/catalog/collection/form` 结构化 Skeleton；禁止 `fallback={null}` 和居中卡片整屏替换 Shell。

## 3. Design Token 与 Recipe Registry

基础参数的单一权威是 `packages/design-system/src/tokens.css`：

- `--motion-duration-fast/standard/slow`：基础档位，并受 development 慢速倍率控制。
- `--motion-duration-control/feedback/page`：用途语义。
- `--ease-product`、`--motion-distance-page`、`--motion-distance-reveal`：缓动与位移语义。

Universal recipe 的单一登记文件是 `packages/design-system/src/motion.css`：

| Recipe              | 消费方                               | Reduced / Off                            |
| ------------------- | ------------------------------------ | ---------------------------------------- |
| `content.enter`     | Route fallback、Async 无内容→有内容  | 全局 Policy 缩短并取消非必要位移         |
| `content.swap`      | `ContentSwapTransition` / `TabsView` | `swap` 分类关闭时禁用                    |
| `viewport.reveal`   | Host `ViewportReveal`                | reduced、off、不支持 Observer 时直接显示 |
| `feedback.presence` | `FeedbackPresence`                   | `feedback` 分类关闭时禁用                |
| `media.ready`       | `ReadyImage`                         | `media` 分类关闭时直接显示               |

Admin `screen.enter/exit`、Shell 锚定、Route content、Viewport 与 State recipe 的具体绑定继续由 `packages/admin-foundation/src/styles.css` 持有。非上述权威文件禁止声明 `@keyframes`。

## 4. Readiness 单一语义

`AsyncRegionPhase` 固定为：

| Phase        | 内容                      | Pending              | `aria-busy` | 整块 content.enter       |
| ------------ | ------------------------- | -------------------- | ----------- | ------------------------ |
| `initial`    | 无可用数据，显示 Skeleton | 可访问 Loading label | 是          | 进入 ready 时播放        |
| `ready`      | 显示内容                  | 无                   | 否          | 仅从无内容阶段进入时播放 |
| `refreshing` | 保留旧内容                | 局部可见             | 是          | 否                       |
| `background` | 保留旧内容                | 默认静默             | 否          | 否                       |
| `empty`      | Empty recovery surface    | 无                   | 否          | 否                       |
| `error`      | Error recovery surface    | 无                   | 否          | 否                       |

`AdminStateRegion` 复用同一 loading/refreshing/background readiness，并额外拥有 Admin 专属 `partial/readonly/denied/pending`。业务不能建立第二套相反的 Loading 规则。关键提交确需阻断时由明确的 Operation/Overlay 契约负责，不归普通数据 refresh。

## 5. Host Motion Policy

`MotionPolicyProvider` 是 `matchMedia`、system preference、development override 与 DOM policy attribute 的唯一入口：

- production 固定 `System`，不渲染 Inspector，不读取或写入调试偏好。
- development 提供 `System/Full/Reduced/Off`，`Screen/Async/Reveal/Swap/Feedback/Media` 分类开关，以及 `1×/2×/4×` 慢速。
- 调试状态只存 `sessionStorage`；Feature props、业务 Store 与持久配置不得感知它。
- `Full` 只用于开发检查；用户生产环境的 reduced-motion 始终由系统策略统一解析。

页面和 Feature 禁止调用 `matchMedia`、创建 `IntersectionObserver`、写入 `data-motion-*` 或手工调用 `startViewTransition`。React `<ViewTransition>` 只协调 Router、Suspense 和稳定 `contentKey` 生命周期。

## 6. 组合规则

- Screen Transition 只表达已经进入另一个 Screen，不等待全部数据后整页 reveal。
- Above-fold Shell/Region 立即稳定；below-fold 只有显式 Region 使用 `ViewportReveal`。
- Async Region 各自 progressive ready；不得 Wait-all → Reveal-all。
- `refreshing → ready`、`background → ready` 保留同一内容实例，不重播整块进场。
- `TabsView` 的键盘、Selection 和 Focus 仍由 HeroUI 主持，Content Swap 只主持面板视觉切换。
- 输入每次击键、筛选请求、表格行和 UI Element 不播放页面级动效。
- Avatar 继续使用 HeroUI Image/Fallback readiness，不嵌套 `ReadyImage`。

## 7. Reduced Motion 与中断安全

`tokens.css` 提供普通元素的全局 reduced/off policy，`admin-foundation/styles.css` 覆盖 View Transition 伪元素。新 recipe 必须同时具备分类关闭和 reduced/off 行为。

自动化必须覆盖：快速 Enter/Exit 反转、refresh 保留内容、background 静默、Observer 注册/注销与 reveal-once、图片 decode/error、键盘 Tabs、路由前进/后退、development policy 恢复、窄屏、Dark、Reduced Motion、Axe 和 Visual。

## 8. 架构门禁

`architecture:check` 拒绝：

- 路由或组件使用 `fallback={null}`。
- Motion 权威文件之外声明 `@keyframes`。
- TSX 硬编码 `duration-N` / `delay-N`。
- Host motion 边界之外使用 `IntersectionObserver` 或 `matchMedia`。
- Feature 写入 `data-motion-*`。

新增动效先识别生命周期并复用上表现役组件。没有现役语义时，先证明真实用例、所有权、中断语义和验证方式；不得以 fade、slide、scale 等实现名称扩展业务 Contract。
