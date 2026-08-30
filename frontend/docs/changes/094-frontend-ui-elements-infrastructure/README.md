# 094 新前端 UI Elements 基础设施完善

## 状态

- 任务性质：`frontend/` 内 UI 基础设施、真实页面迁移、Showcase 与质量门禁的长期工程任务。
- 研究门禁：已通过；证据见 R094-001、R094-002 与 R094-003。
- 计划状态：已确认；用户于 2026-08-30 在完整计划报告后的后续消息明确回复“确认，实施”。
- 实施状态：已完成；入口 revision 为 `22bf5d786ece18cd9ad5913deca4d4706f3e6508`，相关代码相对研究快照未漂移，全部已确认任务和完成审计已闭环。
- 实施节奏：确认后按 `tasks.md` 的线性依赖连续执行，阶段之间不再等待额外确认；新事实命中研究刷新触发器时才退回研究。

### 实施入口基线

- 分支：`main`；HEAD 与 R094-002 研究快照一致。
- `frontend/` 既有用户修改：`AGENTS.md` 标题；实施继续保护并在最终暂存时与本任务规则修改分 hunks 处理。
- 本任务计划产物：`frontend/README.md`、`frontend/AGENTS.md` 的长期规则及 `frontend/docs/changes/`；除此之外没有相关实现漂移，R094-001..003 的 `refresh_triggers` 均未命中。
- 工作区其它父目录变化不属于本任务，不读取为实现输入、不修改、不暂存。

## 目标

在保留 React 19、HeroUI v3、Tailwind CSS v4 和当前多 Host 边界的前提下，把已经建立的 Semantic Token、UI Adapter、Showcase 与 Reference 场景继续收敛为可长期演进的后台管理 UI Elements 体系：

```text
Design Foundations
  -> UI Adapter / Interaction Primitive
  -> UI Element
  -> UI Pattern / Composite
  -> Feature Component
  -> Page / Runtime Host
```

项目定义稳定语义、状态、Anatomy、Variant、组合和验证。HeroUI v3 与 Tailwind CSS v4 不是二选一：HeroUI 实现 Accessibility、Keyboard、Focus、Overlay、Portal、Collision 和复杂控件状态机，Tailwind 可在整个前端通过项目 Semantic Token 实现布局、响应式、主题、密度、视觉状态和跨组件组合；UI Adapter 是 HeroUI 直接依赖以及 Tailwind styling HeroUI compound parts 向上收口的唯一边界。TailAdmin 只作为后台管理场景与视觉校准样本，不进入运行时依赖，也不复制其源码、DOM、CSS、图片或具体尺寸。

## 当前结论

- 当前基础不是推倒重建对象：HeroUI 直接依赖已被限制在 `packages/ui-adapter`，Semantic Token、Form Control、Overlay、DataTable、状态体系、Showcase、Reference 列表/表单和视觉回归均已有真实实现。
- 本任务需要补齐的是完整公共契约与迁移闭环：身份、导航、分页、非确定 Loading、Toast、Confirm、Card Anatomy、Description List、Radio/Toggle、表格排序/多选支撑，以及现有无行为控件和页面私有基础元素。
- `Carousel`、通用 `Image Grid`、`Ribbon`、`Video Player` 等已纳入全量裁决，但当前没有真实产品用例，不建立无调用方公共 Wrapper；它们以 Feature Composition 规则结束，不作为“遗漏”。
- 不新增第二套 UI Library，不升级依赖来代替架构工作；HeroUI 3.2.4 已提供本计划所需的成熟 primitive。
- 不让 Tailwind 重写 HeroUI 已负责的交互状态机，也不让 HeroUI 的 vendor props、slot 或内部 DOM 决定项目视觉契约；缺口优先在 Semantic Token、公开 Variant 和 composition 层解决。
- 上述官方互补模型已经固化到当前 `frontend/AGENTS.md`，作为后续所有公共 UI 建设和版本升级的长期规则，不只约束 094。

## 范围

- `frontend/packages/design-system`、`frontend/packages/ui-adapter`、必要的共享类型与 Reference 数据规则。
- `frontend/apps/web` 的 Shell、Layout、Showcase、Overview、Foundations、States、Preferences、Reference Workspace、Reference Form 与 Error/Loading 边界。
- 单元测试、架构门禁、Playwright 交互/可访问性/视觉回归、性能预算与当前文档 authority。
  不修改当前 `frontend/` 之外的 `webui/`、业务后端、根文档、根构建链、API、数据库、权限、部署环境或用户数据；不复制旧前端实现。

## 阅读顺序

1. [研究索引](research/README.md)
2. [需求摘要](requirements/README.md)
3. [完整能力需求](requirements/ui-elements-capability.md)
4. [设计摘要](design/README.md)
5. [组件契约与分层设计](design/component-contracts.md)
6. [迁移与验证设计](design/migration-and-validation.md)
7. [原始目标完成追踪](design/completion-traceability.md)
8. [线性任务与证据](tasks.md)

## 完成记录

- 核心终态：HeroUI 直接依赖只存在于 `packages/ui-adapter`；Tailwind CSS v4 可在整个 `/frontend` 通过 Semantic Token 负责布局、响应式、主题、密度和视觉组合，只有 styling HeroUI compound parts 的结合面收口在 Adapter。
- 新增/重构：Action/IconAction、ToggleGroup、Avatar/UserIdentity、DescriptionList、Card Anatomy、Breadcrumb/TextLink/Pagination、Busy、FeedbackProvider/Toast、Confirm/Destructive Confirm、Radio 与 DataTable sort/multiple selection。
- 真实迁移：App Shell、Overview、Foundations、States、Preferences、Reference Workspace、Reference Form、Error Boundary 与 Hydrate Loading；旧 PageHeading/Breadcrumb 和直接 Loader 已单轨删除。
- 全量裁决：22 个 TailAdmin UI Elements 页面均有研究与内部落点；SplitButton、AvatarGroup、Workspace Tabs、Loading Overlay、Timeline、Carousel、Image/Grid、Ribbon、Video 等无真实调用方候选按完整裁决关闭，不创建空壳。
- 质量证据：2026-08-31 `pnpm check` 全绿，覆盖 10 个 boundary fixture、78 个源码、20 项依赖、26 个 unit、production build、performance、24 个 Playwright/Axe/visual 与 format；浏览器稳定性 `--repeat-each=3` 为 72/72。
- 性能证据：initial JS gzip 382161 B、total JS gzip 431494 B、CSS gzip 43818 B、largest JS chunk gzip 167588 B；HeroUI/React Aria 单独进入 `ui-vendor`，四项预算均通过。
- 视觉复核：人工检查 22 张 PNG，覆盖 1440/1920/390、Light/Dark、zh/en、comfortable/compact、Toast/Confirm 和关键打开态；修正了 Dialog cancel anatomy、Layer token、1440 SplitView 与 fixed mobile overlay 基线，无 P0/P1 遗留。
