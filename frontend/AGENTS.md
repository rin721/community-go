# Community Go 新前端开发守则

## 1. 适用范围与目标

本文件约束 `/frontend` 内的人工开发与 Coding Agent。这里是全新的统一前端根目录，与根 `webui/`、`old-frontend/` 及其它 legacy product 完全隔离。基础建设阶段不得复制旧系统的 DOM、CSS、组件、页面结构或交互实现，也不得研究后端接口来反向塑造新架构。

技术基线是 React 19、HeroUI v3 与 Tailwind CSS v4。Vite 只属于 Web Host 的 build/tooling 基础设施，不得进入 Feature、Core、Schema 或 UI Contract。

## 2. 架构地图

```text
apps/web       Web Host：入口、路由、App Shell、浏览器集成
apps/desktop   Desktop Host：Runtime 契约、窗口与原生能力集成
     ↓
Application / Feature：页面能力、交互编排、View Model、复合组件
     ↓
packages/ui-adapter    稳定 UI Contract，唯一 HeroUI 直接依赖边界
packages/schemas       运行时数据、配置与表单 Schema
packages/core          与 UI、数据源和 Host 无关的纯规则
packages/types         真正跨模块稳定的共享类型
packages/design-system 语义 Design Token 与主题变量
```

允许的依赖方向：Host 与 Feature 可以依赖公共包；UI Adapter 可以依赖 HeroUI、React 与 Design Token；Schema 可以依赖 Zod 与稳定类型；Core 只依赖稳定类型。公共包禁止依赖 `apps/*`，Core 禁止依赖 UI、Host、Schema 实现或 Infrastructure。

## 3. Host 与共享边界

- Web 与 Desktop 是 Runtime Host，不与 Core、Schema、Adapter 并列为普通分层。
- Host 拥有启动入口、Shell、路由或窗口结构、平台生命周期、Error Boundary 和平台 Adapter 装配。
- 文件系统、窗口、系统菜单、快捷键、更新等 Desktop 能力只留在 `apps/desktop`；DOM、History、Storage 等浏览器能力只留在 `apps/web` 或 Browser Adapter。
- 跨 Host 共享的是产品语义、纯规则、Schema、Types、Design System、UI Contract 和确有复用价值的 Feature，不追求百分之百共享。
- 不得复制两套近似逻辑；也不得为共享而把平台对象、条件分支或最低公分母接口塞入 Core。

## 4. Design System 与样式

- 色彩、Typography、间距、尺寸、圆角、边框、阴影、层级、控件高度、状态色、动画时长和缓动只能由 `packages/design-system` 的语义 Token 管理。
- 页面使用 `bg-surface`、`text-ink-muted`、`rounded-panel` 等语义 class，不硬编码 hex、rgb、阴影、圆角和动画时长。
- 禁止 arbitrary value、深层选择器、样式穿透、`!important` 和针对 HeroUI 内部 DOM 的修正。
- 合理差异先通过 Variant、size、density、state、slot、composition 或 context 表达；不得为一个页面修改全局默认 Token 或公共组件默认行为。
- 复杂组合避免成形组件套成形组件。已有外壳进入 Panel、Dialog、Sidebar 或 Form 时，优先使用 primitive、embedded、inset 或 slot composition。

## 5. UI Contract 与组件职责

- `packages/ui-adapter` 是唯一允许直接导入 `@heroui/*` 的边界，Web 入口只导入其聚合后的 vendor stylesheet。
- UI Adapter 只保护长期高影响能力，不机械封装每个 HeroUI 组件，也不重新制造自研组件库。
- Adapter 对外 props 必须是稳定产品语义，禁止透传 HeroUI props、DOM 结构、slot 名和内部 class。
- Primitive 负责交互基础；通用 UI Component 负责可复用语义；Layout 负责空间骨架；Composite 负责复合交互；Feature/Domain Component 负责业务；Page/Screen 只做路由级编排与状态选择。
- Page 不直接访问第三方 UI、HTTP Client 或 Host 私有实现，不把大段可复用逻辑留在路由文件。

## 6. Core、Schema 与 Types

- Core 必须可独立测试，不依赖 React、UI Library、运行环境、后端或全局可变状态。
- Schema 负责运行时不可信输入、表单模型、配置与未来 API 契约校验。验证失败必须保留可判断的错误语义。
- Types 只保存真正跨模块稳定的 TypeScript 类型；仅在一个 Feature 使用的类型留在 Feature 内。
- 禁止用 `Record<string, unknown>`、任意字符串或断言逃避可明确表达的核心契约。

## 7. i18n 与产品状态

- 所有用户可见文本、日期、时间、数字、相对时间、复数和单位都通过 i18n 基础设施，不在页面硬编码。
- 新功能至少判断 Loading、Empty、Error、Success、Warning、Disabled、Pending、Offline 与 Permission Denied 中适用的状态。
- Skeleton 必须保留目标内容的大致结构；错误状态提供恢复路径；禁用状态说明原因；Pending 与 Loading 不得混用。

## 8. 明确禁止的架构污染

- 在 UI Adapter 外导入 HeroUI，或在业务页穿透第三方 DOM。
- 公共包导入 Host，Core 导入 React/网络/浏览器/Desktop API。
- 为单页新增全局 Token、修改公共组件默认样式或增加全局 CSS hack。
- 跨层深相对路径、万能 `utils`/`common`、共享可变全局状态、万能 Provider 或 Service Locator。
- 复制 Web/Desktop 近似组件，或把 Host 条件分支扩散到共享层。
- 占位页面、假接口、空分支、无调用方抽象、无边界价值 Wrapper 和无完成条件 TODO。

## 9. 质量门禁

每次改动至少执行与范围匹配的检查；交付前执行：

```powershell
pnpm check
```

`architecture:check` 强制 HeroUI 隔离、依赖方向、跨 Workspace 深相对引用、arbitrary value、`!important` 与样式硬编码规则。TypeScript、ESLint、Vitest、Vite build 与 Prettier 分别验证类型、可访问性基础、纯规则、Host 构建和格式。

门禁失败必须修复根因，不得降低规则、增加无条件排除或使用断言掩盖。修改共享基础设施、Token、UI Adapter、Core 或公共组件前，先评估全部调用方；局部差异可由 Feature Composition 解决时不得改全局契约。
