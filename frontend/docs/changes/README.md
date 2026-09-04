# Frontend 变更记录

本目录保存当前 `frontend/` 项目的任务级研究、需求、设计、实施与验证证据（历史账本），
不构成当前架构 authority。当前如何做以 [Frontend 文档手册](../README.md)、
[UI Element System](../ui-element-system.md)、[UI 视觉校准基线](../ui-visual-calibration.md)、
[Motion Foundation](../motion-foundation.md) 与 [Plugin Framework](../plugin-framework.md) 为准。

- [094 新前端 UI Elements 基础设施完善](094-frontend-ui-elements-infrastructure/README.md)：研究门禁已通过，完整线性计划待确认；确认后连续实施 Foundations、UI Elements、Patterns、Showcase、全部现有页面迁移和全量验证。
- [095 页面转场与动效分层](095-page-transitions-and-motion/README.md)：路由级转场（View Transitions API）、Shell 锚定、reduced-motion 豁免与验证；已完成实施与验证。
- [096 Motion Foundation 与语义动效分层](096-motion-foundation/README.md)：动效两层治理（Foundation 管怎么动、Semantic Transition 管为何/何时动）、语义 Token、配方治理、AGENTS 条款与容器目录；已完成实施与验证。
- [097 Motion Governance 体系化与 AsyncRegion 落地](097-motion-governance/README.md)：三层 Motion 模型与 Recipe/Policy/决策树、Motion Region、AsyncRegion（异步内容切换）落地与轻量页面转场；已完成实施与验证。
- [098 Universal Frontend + Admin Product Foundation](098-frontend-product-foundation/README.md)：Universal、Admin Product Surface 与 admin-web Host 三层单轨迁移，含 Form/i18n/Admin Pattern、七类 Page Archetype、Contract Registry 与自动门禁；实施与验证已完成。
- [099 Admin Shell Navigation Interaction](099-admin-shell-navigation-interaction/README.md)：修复父级菜单展开/导航语义、恢复单行 Chevron 视觉并治理 Compact Hover Flyout；实施与验证已完成。
- [100 Top Progress](100-top-progress/README.md)：全局导航进度条（Host 导航生命周期 + 结构化 Loading）；实施与验证已完成。
- [101 Admin Framework / Surface File Routes](101-admin-surface-file-routes/README.md)：Admin Framework 契约、Registry、Surface 私有边界、Reference Plugin、确定性 codegen、治理门禁与最小 Shell bridge；实施与验证已完成。
- [102 Frontend 文档体系](102-frontend-documentation-system/README.md)：前端文档入口手册、Admin Framework authority、既有文档同步、变更索引补全与 `docs:check` 结构门禁；实施与验证已完成。
- [103 导航 no-op 生命周期](103-navigation-noop-lifecycle/README.md)：同 resolved target 重复点击 no-op 短路、导航事务 begin → complete/cancel/fail 收敛、等价判断基于 pathname/search/hash；实施与验证已完成。
- [105 Overlay Trigger 交互状态视觉](105-overlay-trigger-visual-states/README.md)：共享 Overlay Trigger 语义层，pressed/hover/focus 不切换 Brand Blue，danger 语义保持；实施与验证已完成。
