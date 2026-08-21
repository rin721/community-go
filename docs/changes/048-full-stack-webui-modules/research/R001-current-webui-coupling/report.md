# R001 当前 WebUI 全栈耦合审计

## 1. 研究问题与范围

本报告回答：当前页面已经放在 `internal/module/auth|ops/binding/webui/web`，为什么新增或产品化业务页面仍会修改 `webui` 核心；哪些部分是合理的显式装配，哪些部分已经构成反向依赖。

核对快照为 `784bacf`。范围包括 WebUI Binding、Composition、生成器、runtime manifest、React Router、宿主公开契约、Auth/Ops 页面、全局样式、047 计划与 `19b0fa7..784bacf` 提交。

## 2. 当前实现事实

### 2.1 Go 后端掌握前端源码和页面结构

`internal/webui.Binding` 不只表达后端模块可用性，还包含：

- TS/TSX `Entry.SourcePath`；
- 浏览器 path、layout、default route 与 delivery state；
- navigation parent、icon、order；
- locale JSON `SourcePath`。

Auth/Ops 的 `binding/webui/binding.go` 因而同时承担后端 composition 声明和前端页面目录索引。这个契约已经越过 HTTP 边界，直接知道构建工具要 import 哪个前端文件。

### 2.2 Composition 与 codegen 形成跨语言编译耦合

`applicationWebUICatalog()` 直接 import Auth/Ops WebUI Binding。`GenerateWebUIRegistry()` 读取 `SourcePath`，检查文件，再输出相对路径 dynamic import。生成的 `webuiEntryRegistry` 因而把 `webui/` 构建指向 `internal/module/**/web/*.tsx`。

runtime `/api/v1/webui/manifest` 虽然不会泄漏 `SourcePath`，但浏览器只能加载构建时已经由 Go Catalog 选入的 Entry。这里同时存在两份职责：

- Go Catalog 决定编译哪些页面；
- runtime manifest 再决定哪些 route/menu 对当前主体可见。

它避免了宿主手写 Auth/Ops `<Route>`，却没有形成前后端独立契约。

### 2.3 宿主公开契约仍然绑定 Auth 业务模型

`webui/src/contracts/index.tsx` 公开 `WebUIUser`、`WebUISession`、`completeAuthentication`；`webui/src/api.ts` 直接调用 WebUI Auth session/logout；`App.tsx` 直接维护 session、CSRF token 与登录完成后的 manifest 刷新。

因此平台层不是通用的身份/访问抽象，而是当前 Auth 模块的浏览器客户端。未来完整账号、角色、权限、会话管理一旦扩展，宿主很容易继续吸收业务字段和动作。

### 2.4 业务视觉规则进入宿主全局 CSS

`webui/src/styles.css` 已包含 `auth-*`、`ops-*`、`diagnostic-*`、`capability-*`、`scope-*` 等业务专属 selector。模块页面虽然位于业务目录，视觉实现却由宿主全局文件持有。

这会产生两个后果：

1. 页面调整必须修改宿主核心文件；
2. selector 没有模块作用域，不同模块可以意外覆盖彼此。

### 2.5 047 的任务划分混合了平台与业务产品化

047 最初声明宿主 A–C 与真实页面 D 分离，但后续又把 Auth Session 页面、Ops 能力列表、Ops Dashboard 概览和 metrics 卡片作为“已实施未闭合”纳入首次宿主阶段。`19b0fa7..784bacf` 的 diff 同时修改 `webui/src/ui`、`webui/src/styles.css`、Auth 页面和 Ops 页面。

这不是单个代码错误，而是任务边界没有阻止“业务页面缺什么，就把什么加入宿主”。

## 3. 合理装配与错误耦合的区别

以下属于合理且必须保留的显式装配：

- 后端 composition root 选择启用哪些 Go 业务模块；
- 前端 composition profile 选择当前 WebUI 构建包含哪些前端业务模块；
- 新模块在唯一 profile 中增加一项；
- 平台校验 route ID、path、navigation 和 operation 引用冲突。

以下属于应删除的跨边界耦合：

- Go 契约保存 TSX/locale 源码路径；
- 后端生成前端 import registry；
- 前端业务源码位于 Go `internal/module`；
- 平台契约直接暴露 Auth Session DTO；
- 业务 CSS、表格列和页面布局进入平台全局文件；
- 业务模块导入另一个业务模块或宿主内部 Router/Store。

显式 composition 不是“修改核心设计”。如果新增模块只在 `app/profile.ts` 增加模块定义，而 Router 编译器和 Shell 不变，这正是 composition root 的职责。

## 4. 当前能力可复用部分

不需要推倒重建的能力包括：

- Go 业务模块的 Model/Service/Handler/binding 与 HTTP code-first 契约；
- operation ID、Auth policy 与服务端 operation gate；
- React/Vite/TypeScript、React Router、TanStack Query、i18n 和宿主 Shell；
- 现有 Auth/Ops 页面中的真实 API 流程和低敏错误码映射；
- 047 建立的项目自有 UI primitives 中真正业务无关的部分。

需要重新归属或替换的是 WebUI Catalog、SourcePath codegen、Auth-specific host contract、全局业务 CSS 和当前页面目录。

## 5. 推断与判断

### 推断

仅把 CSS 拆文件、继续保留 Go `SourcePath` 不能解决问题，因为页面编译来源和前后端所有权仍然相互穿透。

仅把所有页面集中搬进 `webui/src/pages` 也不能满足目标，因为账号、审计、系统配置等能力会再次失去模块 owner。

### 判断

当前实现是“后端模块共置前端源文件的构建期扩展”，不是前后端分离的全栈业务模块。新方案必须同时完成：

1. 前后端源代码物理分离；
2. 逻辑 ModuleID 与 API/operation 对齐；
3. 前端模块拥有自身 routes/navigation/locales/pages/styles；
4. 平台只消费窄模块定义和通用身份/访问抽象；
5. 新模块只改变 module facet 与 composition profile。

## 6. 局限与刷新条件

本报告是静态代码审计，没有启动服务或浏览器；这不影响依赖方向判断。实施前必须重新搜索 `internal/webui`、`binding/webui`、`@webui/contracts`、业务 CSS selector 与生成脚本的全部调用方。

如果后续目标变成第三方独立发布、运行时安装/卸载或跨团队远程部署模块，本报告不支持直接采用当前推荐方案，需要独立研究微前端、签名、沙箱和版本协商。

## 7. 对 048 的影响

研究支持停止 047 未完成实施路线，并建立前后端分离但保持逻辑业务模块完整的 048 方案。旧代码不能与新架构长期双轨；迁移完成后必须删除 SourcePath Catalog、旧 codegen 和旧页面目录。
