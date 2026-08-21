# 048 全栈业务模块化 WebUI 需求

## 1. 产品目标

建立可持续扩展的后台业务模块体系。账号与权限、日志与审计、系统配置、运维工具以及未来业务模块都能完整拥有自己的后端能力和 WebUI 页面，同时共享稳定宿主平台；新增模块不需要修改宿主核心设计。

## 2. 术语

- **逻辑业务模块**：以稳定 `ModuleID` 标识的业务边界。
- **backend facet**：`internal/module/<id>` 下的 Go Model、Service、Handler、HTTP contract、operation、Repository、binding 与 contribution。
- **web facet**：`webui/src/module/<id>` 下的 route、navigation、locale、API client、page、component、style 与 test。
- **platform**：WebUI Router 编译器、Shell、身份/访问抽象、i18n runtime、主题和项目自有 UI primitives。
- **composition profile**：显式选择当前应用包含哪些 backend/web facet 的唯一装配文件。

## 3. 功能要求

| ID | 要求 |
| --- | --- |
| REQ-001 | 同一逻辑业务模块可以有 backend facet 与 web facet；两者共享稳定 ModuleID，但不得互相导入源码。 |
| REQ-002 | backend facet 只通过 HTTP/OpenAPI、operation ID、错误码和模块可用性对浏览器提供能力，不得保存 TSX、locale 或 CSS 文件路径。 |
| REQ-003 | web facet 必须拥有自身 route、navigation、locale、API client、page、component、局部样式与测试。 |
| REQ-004 | 新增模块只允许修改自身 backend/web facet，以及前后端各自唯一 composition profile；不得修改平台 Router、Shell、全局 CSS 或其他业务模块。 |
| REQ-005 | 前端 profile 必须显式列出 WebModuleDefinition；禁止目录扫描、`import.meta.glob` 自动注册、全局可变 registry 和 import side effect。 |
| REQ-006 | 平台从不可变 module definitions 构建单一 React Router route tree，并在资源副作用前拒绝重复 ModuleID、RouteID、path、navigation ID、locale namespace 和非法 parent。 |
| REQ-007 | 页面实现必须通过 route lazy import 延迟加载；lazy import 只存在于 web facet，后端不得生成 import registry。 |
| REQ-008 | 后端提供版本化 WebUI bootstrap API，返回 protocol version、启用模块及 API version/state、通用 principal 和 operation access snapshot；不得返回 SourcePath、component、菜单文案或可执行代码。 |
| REQ-009 | 静态前端 catalog 与后端 bootstrap 必须 fail closed 对齐：缺少 backend module、API version 不兼容或 protocol mismatch 时不执行页面请求，并呈现低敏诊断。 |
| REQ-010 | 服务端 operation gate 始终是最终授权 authority；前端 route guard/menu filter 只负责体验和状态呈现。 |
| REQ-011 | 平台只依赖通用 Principal、AccessSnapshot、IdentitySessionPort 和 HostRuntime，不公开账号模块 Session DTO、角色模型、CSRF 存储或 API 路径。 |
| REQ-012 | 账号模块负责登录、退出、用户、角色、权限、会话和安全策略等业务；平台仅通过 typed identity port 获得当前主体和刷新/退出能力。 |
| REQ-013 | 每个 web facet 必须声明并拥有 locale namespace；用户可见文案、错误码映射和缺失资源语义继续 fail closed。 |
| REQ-014 | 业务样式必须使用 CSS Modules 或等价局部作用域；平台全局样式不得出现 Auth/Ops/Audit/System 等业务 selector。 |
| REQ-015 | 模块只消费平台公开 SDK 与项目自有 UI primitives，不直接依赖 Router 内部、Shell store、i18n singleton 或第三方 UI 具体类型。 |
| REQ-016 | 两个业务模块之间不得直接 import；跨模块导航使用公开 RouteID，跨模块业务协作通过后端窄契约和 composition 完成。 |
| REQ-017 | 模块 API client 必须支持 AbortSignal、稳定错误码、低敏失败映射和统一凭据策略，不在页面组件散落 URL、CSRF 或 response parsing。 |
| REQ-018 | WebUI 与 Go 服务必须可独立构建；产物可以同源托管，也可以分离部署，部署形态不得改变模块源码依赖方向。 |
| REQ-019 | 当前 Auth/Ops 页面迁移必须保留真实 API、Session、CSRF、Origin、management 和权限语义，不通过兼容层长期保留旧 Binding/codegen。 |
| REQ-020 | 迁移完成后单轨删除 `Entry.SourcePath`、Go 驱动的前端 registry、`internal/module/**/binding/webui/web` 和宿主业务 CSS。 |
| REQ-021 | 完整账号权限、审计、系统配置/工具模块必须分别经过真实用例研究、计划和确认；048 基础迁移不得生成假 CRUD、假统计或空模块。 |

## 4. 质量要求

### 4.1 依赖与演进

- `app -> platform + module definitions`；`module -> platform public SDK/UI`；`platform -> no business module`。
- 每项共享平台能力必须有稳定、无业务语义的 contract；业务专属复合组件留在模块。
- 新平台能力与新业务模块不能在同一未经重新确认的任务中混写。

### 4.2 安全

- bootstrap 不返回密码、Token、Cookie、CSRF 原值、完整内部 scope/policy 或敏感配置。
- 前端隐藏菜单不构成授权；所有读写 API 都执行服务端 operation gate。
- 独立部署必须保持当前 Cookie、Origin、CORS 和 CSRF 安全要求，不能为“前后端分离”降低安全属性。

### 4.3 可诊断性

- 明确区分 module absent、API incompatible、access denied、authentication required、degraded、unavailable 和 route load failure。
- 浏览器错误只显示稳定 module/route/operation ID 与低敏错误码；原始响应和凭据不得进入 UI 或日志。

### 4.4 可测试性

- 架构测试证明 platform 不导入 module、module 不互相导入、backend 不包含前端 SourcePath、全局 CSS 无业务 selector。
- module contract tests 覆盖 duplicate、version mismatch、missing backend、permission、lazy failure 和 locale failure。
- Auth/Ops 迁移后完成真实 setup/login/logout/session、权限直达、Ops query 与桌面/移动视觉回归。

## 5. 非目标

- 不实现第三方插件市场、远程模块、Module Federation 或运行时安装卸载。
- 不让服务端通过 API 下发 React component、JS URL 或页面源码。
- 不把所有后端模块强制配套 WebUI；没有管理用例的模块可以只有 backend facet。
- 不把“系统工具集”建设成无归属的万能模块；配置、运维动作、诊断和审计必须按真实语义确定 owner。
- 不在 048 基础迁移中实现完整账号权限、审计或系统配置业务本身。

## 6. 验收标准

1. 一个验证模块可以只新增自身 backend/web facet，并在两个 profile 各增加一项，Router/Shell/global CSS 零修改即可显示真实页面并调用真实 API。
2. 前端产物不再从 `internal/module` import TS/TSX/JSON，Go 代码不再保存前端 SourcePath。
3. Auth/Ops 单轨迁移后旧 codegen、旧页面目录、旧 manifest route/menu authority 和业务全局 CSS 被删除。
4. bootstrap/catalog mismatch、认证、拒绝、降级和 lazy load failure 均有确定状态和测试。
5. 全量 Go/TS/React/E2E/visual/architecture 门禁通过，文档与当前实现同步。
