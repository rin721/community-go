# 042 Admin WebUI 模块化宿主与可选 Admin Binding

状态：研究门禁已通过，计划已确认；非文档实施受前置迁移尚未形成干净 Git 基线阻塞。

## 范围

本变更建立独立的 Admin WebUI 宿主和可选 Admin Binding。宿主统一负责布局、导航、路由承载、权限呈现、i18n、主题、公共交互与模块页面装配；只有存在真实运营、配置、查询、审核或人工操作需求的业务模块才声明 Admin Binding。

首批接入范围固定为：

- Auth 模块贡献首次设置、登录与会话页面，并提供服务端有状态 Session；
- Ops 模块贡献真实运行状态看板；
- Todo 模块不提供 Admin Binding，用于证明 Admin 能力不是所有模块的强制契约；
- 新增独立 `webui/`，不修改现有 Nuxt `frontend/`，不复用 `old-backend/` 的历史后台实现。

本目录只记录研究、需求、设计、任务和门禁证据。当前工作树仍包含前置迁移的大量删除、修改和未跟踪文件；在用户形成干净基线前，不得开始源码、配置、依赖、migration、生成物或测试实现。

## 阅读顺序

1. [研究索引](research/README.md)：当前模块、Binding、Composition、Auth、Ops、i18n、HTTP Contract 与前端技术选型事实。
2. [需求规格](requirements.md)：目标、功能要求、非目标和验收标准。
3. [设计方案](design.md)：Admin Catalog、manifest、生成装配、Session 认证和 WebUI 数据流。
4. [任务清单](tasks.md)：稳定任务 ID、依赖、确认状态、阻塞和验证方案。

## 当前结论

- 现有业务模块已经采用按需 Binding 与显式 Composition，不需要也不允许为 Admin WebUI 建立动态插件或自动扫描体系。
- 当前 `module.Contribution` 只承载 Participant、Schedule 和 Message；HTTP、i18n 等 Binding 由模块声明并在 `internal/composition` 显式聚合。Admin 应沿用同一路径，保持可选。
- Auth 当前只有 `development-anonymous` 和 JWT HTTP profile，尚无本地管理员、密码存储、Session Repository、CSRF 或 Admin HTTP operation。
- Ops 已提供 build、startup、liveness、readiness、diagnostics 和 metrics 等真实 management 能力，可作为首个真实看板数据源。
- React 19、Vite、TypeScript、HeroUI v3 与 Tailwind CSS 4 具备官方集成路径；选型属于目标设计，不代表仓库已经安装或实现。
