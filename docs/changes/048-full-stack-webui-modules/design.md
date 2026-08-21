# 048 全栈业务模块化 WebUI 整体设计

## 1. 设计结论

采用“静态编译的全栈业务模块 + 前后端契约握手”。业务模块在逻辑上完整，在源码和构建上分成 backend facet 与 web facet：

```text
Logical Module: account
├─ backend facet: internal/module/account
│  └─ Model / Service / Handler / HTTP Contract / Operation / Repository
└─ web facet: webui/src/module/account
   └─ Definition / Route / Navigation / Locale / API / Page / Style / Test

             stable ModuleID + HTTP/OpenAPI + OperationID
backend facet <------------------------------------------> web facet
```

两边不共享源码路径，不由后端生成前端 import。应用 composition 分别选择两边，bootstrap 在运行时验证它们是否兼容。

## 2. 依赖方向

```text
webui/src/app
  ├─> webui/src/platform
  └─> webui/src/module/*/module.ts

webui/src/module/*
  ├─> @webui/platform-sdk
  └─> @webui/platform-ui

webui/src/platform -X-> webui/src/module/*
webui/src/module/a -X-> webui/src/module/b

internal/composition
  └─> internal/module/* public assembly/binding

internal/module/* -X-> webui/**
webui/** -X-> internal/module/**
```

`app` 是唯一同时知道 platform 与各 web facet 的前端 composition root。增加一项 import 和 profile entry 是装配动作，不改变 Router 或 Shell 实现。

## 3. 目标目录

```text
internal/
├─ composition/
│  ├─ application_modules.go
│  └─ webui_bootstrap.go
├─ module/
│  ├─ account/
│  ├─ audit/
│  ├─ ops/
│  └─ systemsettings/
└─ webui/
   └─ bootstrap/              只定义浏览器 bootstrap wire，不含前端路径

webui/src/
├─ app/
│  ├─ profile.ts             Web facet 唯一显式选择点
│  ├─ create-application.tsx
│  └─ main.tsx
├─ platform/
│  ├─ contract/              ModuleID、RouteID、Principal、AccessSnapshot
│  ├─ router/                definition 校验与 RouteObject 编译
│  ├─ identity/              typed IdentitySessionPort
│  ├─ http/                  credentials、取消、错误 envelope
│  ├─ i18n/                  单一 runtime 与 namespace 装入
│  ├─ shell/                 Shell、layout、系统状态页
│  ├─ theme/                 token、主题和持久化
│  └─ ui/                    项目自有、无业务语义的 UI primitives
└─ module/
   ├─ account/
   │  ├─ module.ts
   │  ├─ api/
   │  ├─ route/
   │  ├─ page/
   │  ├─ component/
   │  ├─ locale/
   │  ├─ style/
   │  └─ test/
   ├─ audit/
   ├─ ops/
   └─ systemsettings/
```

实际实施只创建当前迁移需要的目录，不为未来模块预建空目录。

## 4. 前端模块定义

### 4.1 公共类型

```ts
export type ModuleID = string & { readonly __moduleID: unique symbol };
export type RouteID = string & { readonly __routeID: unique symbol };
export type OperationID = string & { readonly __operationID: unique symbol };

export type WebModuleDefinition = Readonly<{
  id: ModuleID;
  apiVersion: string;
  routes: readonly WebModuleRoute[];
  navigation: readonly WebModuleNavigation[];
  locales: Readonly<Record<LanguageTag, WebModuleLocaleLoader>>;
}>;

export type WebModuleRoute = Readonly<{
  id: RouteID;
  path: string;
  layout: "app" | "blank";
  titleMessageID: string;
  viewOperation?: OperationID;
  index?: boolean;
  lazy: () => Promise<WebRouteModule>;
}>;
```

定义是构建期不可变值，不带运行时注册方法，不接收 Router/Store/Container。

### 4.2 模块示例

```ts
export const accountWebModule = defineWebModule({
  id: moduleID("account"),
  apiVersion: "v1",
  routes: [
    route({
      id: routeID("account.users"),
      path: "/security/accounts",
      layout: "app",
      titleMessageID: "webui.account.users.title",
      viewOperation: operationID("account.user.list"),
      lazy: () => import("./route/users"),
    }),
  ],
  navigation: accountNavigation,
  locales: accountLocales,
});
```

路径、lazy import、navigation 和 locale 均属于 account web facet。平台只校验并编译定义。

## 5. 前端 composition profile

```ts
import { accountWebModule, accountIdentityPort } from "@module/account";
import { auditWebModule } from "@module/audit";
import { opsWebModule } from "@module/ops";

export const applicationProfile = defineApplicationProfile({
  identity: accountIdentityPort,
  modules: [accountWebModule, auditWebModule, opsWebModule],
});
```

约束：

- profile 是唯一业务模块汇总点；
- 不使用 glob、文件系统扫描、side-effect import 或动态任意字符串 import；
- identity 是一个显式 typed port，不是任意 capability registry；
- profile 在创建 Router、加载 locale 或请求业务 API 前完成静态校验。

## 6. Router 编译

平台把全部 definitions 编译成 React Router `RouteObject[]`：

1. 校验 ModuleID、RouteID、path、navigation ID、parent、locale namespace 和 default route；
2. 按 layout 把 route 挂到 `BlankLayout` 或 `AppLayout`；
3. 将 `route.lazy` 直接映射为 React Router lazy route module；
4. 统一附加 authentication/access guard、route error boundary 和 module compatibility guard；
5. 从同一 route metadata 生成 breadcrumb、tab、search 和 navigation view；
6. 创建一次 `createBrowserRouter`，不在 React state 中重建 Router。

模块不得获得 Router 实例。模块内导航使用平台公开的 RouteID helper；需要 URL param 时由 route contract 明确声明并校验。

## 7. WebUI bootstrap API

### 7.1 责任

新的 `GET /api/v1/webui/bootstrap` 是浏览器与后端运行时握手，不是页面注册 API。它回答：

- 当前 bootstrap protocol version；
- 当前服务启用了哪些 backend modules；
- 每个模块支持的 API contract version 与运行状态；
- 当前通用 principal 是否存在；
- 当前主体对 WebUI 引用 operation 的 access decision；
- 安全的 UI runtime flags，例如允许语言或产品显示名。

它不返回：

- TSX/JS/CSS/locale 文件路径；
- component、lazy import 或 remote URL；
- route path、menu order、icon、页面标题；
- Cookie、CSRF token、密码、Token、完整 policy 或内部配置。

### 7.2 DTO 草案

```go
type Bootstrap struct {
    ProtocolVersion string                  `json:"protocolVersion"`
    BackendRevision string                  `json:"backendRevision"`
    Modules         []ModuleAvailability    `json:"modules"`
    Principal       *PrincipalView          `json:"principal,omitempty"`
    Access          map[string]Access       `json:"access"`
    Runtime         RuntimePresentation     `json:"runtime"`
}

type ModuleAvailability struct {
    ID         string `json:"id"`
    APIVersion string `json:"apiVersion"`
    State      string `json:"state"`
}
```

具体字段和错误 envelope 在实施研究中以现有 Auth/Ops API 为证据收敛；不得把草案当作已实现接口。

### 7.3 对齐规则

| 情况 | 前端行为 |
| --- | --- |
| frontend 与 backend ModuleID/API version 匹配 | route 按 access/state 正常启用 |
| frontend 有模块、backend 未启用 | 隐藏导航；直达显示 Module Unavailable，不调用 API |
| backend 有模块、frontend 未编译 | 记录低敏 assembly mismatch；不自动下载代码 |
| API version 不兼容 | 禁用模块 route，显示 Incompatible |
| protocol version 不兼容 | 整体启动失败，显示宿主 mismatch 状态 |
| module degraded | 保留可用页面/动作，由模块状态策略呈现 |
| access denied | 菜单过滤；直达 403；服务端仍再次授权 |

## 8. 身份与权限

### 8.1 平台身份契约

```ts
export type Principal = Readonly<{
  subjectID: string;
  displayName: string;
}>;

export interface IdentitySessionPort {
  signOut(signal: AbortSignal): Promise<void>;
}
```

`Principal` 来自 bootstrap，平台 Shell 只展示该安全视图并通过 port 触发 `signOut`。账号模块内部拥有登录凭据、CSRF、Session DTO、用户详情、角色和权限模型。登录成功后页面只调用 `host.refreshBootstrap()`，不把 Auth Session DTO 写入 HostRuntime。

### 8.2 权限

- backend facet 声明 operation 并接入现有 Auth policy；
- web route 只引用稳定 OperationID；
- bootstrap 由服务端 authorizer 计算 access snapshot；
- frontend guard 只用于呈现；
- 每次 API 调用仍经过服务端 gate；
- route/menu 不声明内部 role 名称或复制 policy 规则。

## 9. HTTP/API 边界

每个 web facet 拥有模块 API client：

```text
module/account/api/
├─ client.ts       账号 API 的窄操作
├─ contract.ts     页面需要的项目自有 DTO
├─ error.ts        error code -> message ID
└─ query.ts        TanStack Query keys/options
```

页面不直接调用 `fetch`。platform HTTP 只负责 credentials、AbortSignal、JSON envelope、通用 correlation ID 和低敏 protocol error；account client 负责 `/api/v1/accounts/**`、业务 DTO 与账号错误码。

OpenAPI 继续由后端 module-owned code-first contract 生成。是否增加 TypeScript type generation 在实施前单独比较维护成熟度与生成边界；无论选用何种工具，页面依赖模块自有 client，不直接依赖生成器运行时类型。

## 10. i18n

- platform 初始化唯一 i18n runtime；
- 每个 web facet 导出自己的 namespace 和 lazy locale loaders；
- module definition 校验 route/navigation message ID 属于本模块 namespace；
- 模块只能通过公开 `useModuleTranslation(moduleID)` 或收敛后的 namespace hook 获取文案；
- error code 只映射 message ID；
- 缺少语言、namespace 或 key 时模块 fail closed 或显示明确低敏诊断；
- backend 不再知道 locale JSON SourcePath。

## 11. 样式与 UI

### 11.1 平台拥有

- design tokens、主题、density；
- Shell、layout、navigation、route state；
- Button、Field、Surface、Table、Dialog、Drawer、Toast 等真正通用 primitives；
- primitives 对第三方库做项目自有薄封装，不暴露 HeroUI 具体类型。

### 11.2 模块拥有

- 业务页面布局和复合组件；
- 表格列、筛选器、表单 schema、统计卡片语义；
- CSS Modules；
- 响应式页面细节与业务视觉测试。

例如 `AccountSummaryCard`、`AuditEventDetail`、`MetricsSnapshot` 不进入 platform。两个模块确实出现同一无业务模式后，另立平台变更研究是否提升。

## 12. 目标业务模块示例

### 12.1 Account：账号与权限

backend facet 拥有用户、凭据、角色、权限、Session、安全策略、审计事件产生和对应 API/operation。web facet 拥有：

- 登录/首次设置；
- 用户列表、详情、创建、禁用和密码策略；
- 角色与权限编排；
- Session 管理与强制撤销；
- 当前主体与安全设置。

平台不拥有这些页面和 DTO，只消费 identity port 与 principal。

### 12.2 Audit：日志与审计

应区分应用日志、审计事件和可观测诊断：

- Audit 模块拥有不可变审计事件查询、条件过滤、详情和导出授权；
- Ops/Observability 继续拥有运行日志、metrics、trace 和健康诊断；
- web facet 可以分别贡献“审计事件”和“运行诊断”页面，但不能把两类数据混成一个万能日志表。

### 12.3 System Settings 与 Maintenance Tools

“系统工具集”不能成为 `utils` 式杂物模块：

- `systemsettings` 拥有受控配置项、候选校验、变更预览和应用结果；
- `ops` 拥有健康、构建、diagnostics、metrics；
- 有真实人工运维动作时再建立明确 owner，例如 cache maintenance、message replay 或 migration operation；
- 高风险动作必须有 operation、确认、审计、幂等/执行记录和结果状态，不能由前端直接拼接内部命令。

## 13. 构建与部署

### 13.1 独立构建

- `go test/build` 不读取 TSX 或 locale JSON；
- `pnpm build` 不跨入 `internal/module`；
- WebUI build 输出静态 catalog revision；
- CI 同时校验 frontend profile 与 backend module inventory 的兼容矩阵。

### 13.2 部署

支持两种形态，但保持同一契约：

1. Go 服务同源托管 WebUI 静态产物；
2. WebUI/CDN 与 API 分离部署，使用精确 Origin/CORS/CSRF 配置。

前后端分离不等于降低 Cookie、Secure、SameSite、Origin 或 CSRF 要求。

## 14. 单轨迁移

### Phase 0：冻结旧路线

- 停止 047 未完成业务产品化；
- 不再向 `internal/webui.Binding`、Go registry 或全局业务 CSS 增加能力；
- 记录当前 Auth/Ops 行为与测试基线。

### Phase 1：建立 platform contract 与静态 profile

- 新增 WebModuleDefinition、profile validation、Router compiler；
- 把 HostRuntime 收敛为 Principal/Access/refreshBootstrap；
- 建立 CSS Module、public imports 和架构门禁；
- 尚不迁移新业务模块。

### Phase 2：迁移 Auth

- 页面移动到 `webui/src/module/account`；
- account web facet 提供 identity port；
- 保持 setup/login/logout/session、CSRF、Origin 与数据库行为；
- 删除宿主对 WebUISession/Auth API 的直接依赖。

### Phase 3：迁移 Ops

- 页面、API、locale、query 和业务 CSS 移动到 `webui/src/module/ops`；
- 保持 management API 和 degraded 语义；
- 删除全局 Ops selector。

### Phase 4：替换后端 WebUI Catalog

- 新增 bootstrap module availability/access 协议；
- 删除 Entry/Route/Navigation/Locale SourcePath contract；
- 删除 `applicationWebUICatalog`、Go-driven registry 和旧 generated imports；
- 清理旧目录、脚本、测试和文档。

### Phase 5：证明新模块接入

只选择一个具有真实 API 的小切片作为验证模块。新增自身 backend/web facet 和两个 profile entry，证明 platform 零修改。不得用假数据或空 CRUD 验收。

### Phase 6：独立业务增量

完整 Account、Audit、System Settings/Tools 分别建立后续变更，重新研究数据模型、权限、迁移、资源和验收，不塞进 048 基础重构。

## 15. 文件影响预估

实施预计影响但本轮不修改：

- `internal/webui/**`、`internal/composition/webui_*`；
- `internal/module/auth|ops/binding/webui/**`；
- `webui/src/App.tsx`、`api.ts`、`contracts/**`、`generated/**`、`styles.css`；
- 新增 `webui/src/app/**`、`webui/src/platform/**`、`webui/src/module/account|ops/**`；
- WebUI scripts、ESLint/TypeScript path、测试和当前 authority 文档。

不修改 Todo 业务、数据库 schema、Kernel lifecycle、普通 API 路由语义或现有社区 Nuxt `frontend/`。

## 16. 验证设计

| 层级 | 门禁 |
| --- | --- |
| Go | bootstrap contract、module inventory、operation reference、全量 `go test ./...` |
| TypeScript | definition/profile typecheck、route compiler、API client 和 module tests |
| Architecture | platform/module 依赖方向、无跨模块 import、无 backend TS path、无业务全局 CSS、无自动扫描 |
| Contract | ModuleID/API version/protocol/access/mismatch matrix |
| E2E | setup/login/logout/session、403、module absent/incompatible、Ops 真实查询 |
| Visual | Account/Ops 页面桌面/移动、明暗主题、module error state |
| Build | Go 与 WebUI 独立构建；静态产物不引用仓库源码路径 |
| Diff | 旧 Binding/codegen/目录/文档无残留；`git diff --check` |

## 17. 风险与控制

| 风险 | 控制 |
| --- | --- |
| 前后端 profile 漂移 | bootstrap handshake + CI compatibility matrix |
| profile 变成第二个业务目录 | profile 只列 immutable definitions，不写 route/business logic |
| platform UI 再次膨胀 | 业务复合组件默认留模块，平台提升另立任务 |
| Auth 仍污染宿主 | typed IdentitySessionPort + generic Principal，禁止 WebUISession 进入 platform |
| “工具集”成为杂物模块 | 按配置、诊断、维护动作划分 owner 和 operation |
| 迁移长期双轨 | 按 Phase 单轨删除旧入口，不保留 alias/compatibility branch |
| 误升级为微前端 | 静态 imports、单 bundle/受控 chunks；远程加载另立研究 |

## 18. 重新确认触发器

以下事实会实质改变方案，必须退回研究并重新确认：

- 需要第三方或远程独立发布模块；
- 需要运行时安装、卸载或热替换页面；
- 身份不能由单一 typed port 表达，需要多个并存身份提供方；
- bootstrap 需要泄漏内部 policy、动态页面 URL 或敏感配置；
- 前端准备拆为多个仓库/独立发布单元；
- 需要改变现有 Session/CSRF/Origin、数据库 migration、API path 或 operation semantics；
- 选择新的 Router、UI、状态框架或 OpenAPI generator。
