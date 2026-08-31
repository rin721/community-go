# Admin Product-Surface Foundation 开发约束

- 本目录只拥有 Admin Surface 的稳定 Layout、Shell 表现、UX Pattern、Page Archetype 与 Motion Recipe。
- 允许依赖 Universal Foundation，禁止依赖 `apps/*`、Next、Browser/Desktop API、后端 DTO、请求、Session 或权限实现。
- 组件只接收业务已决定的内容、状态、权限呈现和动作，不读取数据或计算业务规则。
- 新 Pattern 必须至少覆盖两个独立 Admin 场景，并在 `/admin-patterns` 与 `/admin-reference` 中分别证明 Contract 和完整组合。
- 不得把 Product Surface 差异抽象成万能 Pattern；未来 Product Foundation 必须单独建立。
