# 048 全栈业务模块化 WebUI 重构

状态：研究门禁已通过，纯文档方案已完成；非文档实施待用户确认。

## 目标

本变更重新定义“业务模块渲染 WebUI”的边界：一个逻辑业务模块可以同时拥有 Go 后端 facet 与 React WebUI facet，但两者必须通过稳定 HTTP/API 契约连接，不能共享 TSX 源码路径、Router 内部对象、全局样式或宿主状态。

目标形态支持账号与权限、日志与审计、系统配置、运维工具等完整业务模块持续接入。新增模块只需要：

1. 在 `internal/module/<module-id>` 实现后端业务、HTTP 契约与 operation；
2. 在 `webui/src/module/<module-id>` 实现页面、路由、菜单、locale、API client 与局部样式；
3. 在后端和前端各自唯一的 composition profile 中显式选择该模块；
4. 通过 `ModuleID`、API version、operation ID 与 WebUI bootstrap 握手验证两端兼容性。

Router、Shell、平台 UI、全局 CSS 和其他业务模块不因新增业务页面而修改。composition profile 增加一项属于应用装配，不属于修改宿主核心设计。

## 核心决策

- 采用静态编译的全栈业务模块，不采用运行时远程模块、Module Federation、自动目录扫描或 `init` 自注册。
- Go 后端不再声明 `SourcePath`、前端路由、菜单文案资源路径或 TSX Entry。
- 前端模块定义是页面路由、导航、locale 和 lazy import 的唯一来源。
- 后端 API 是业务数据、命令、权限和错误语义的唯一来源；服务端不通过 API 下发可执行页面代码。
- WebUI 平台只拥有 Router 装配、Shell、身份抽象、访问守卫、i18n runtime、主题和项目自有 UI primitives。
- 业务专属页面、组件、查询、表格列、表单、locale 和 CSS 必须留在所属前端模块。
- 047 未完成的产品化路线停止继续实施；其已提交代码仍是当前实现事实，直到 048 获确认并完成单轨迁移。

## 阅读顺序

1. [研究索引](research/README.md)
2. [需求规格](requirements.md)
3. [整体设计](design.md)
4. [实施任务与确认边界](tasks.md)

## 当前与目标的区别

| 维度 | 当前实现 | 048 目标 |
| --- | --- | --- |
| 页面源码 | 位于 Go `internal/module/**/binding/webui/web` | 位于独立前端 `webui/src/module/<id>` |
| 路由来源 | Go Binding + SourcePath codegen + runtime manifest | 前端模块定义 + 静态 composition profile |
| 后端 WebUI 契约 | 知道 Entry、route、navigation、locale 文件 | 只知道 module availability、API/operation 与 access |
| 宿主依赖 | 直接知道 WebUISession/Auth logout，含 Auth/Ops CSS | 只依赖通用 Principal、AccessSnapshot 与平台 port |
| 新模块接入 | 容易继续扩张宿主 UI/CSS | 只改模块与 composition profile |
| 发布 | Go 源码与 TSX 构建期交织 | 前后端独立构建，可同源部署或分离部署 |

## 实施门禁

本次交付仅建立研究与设计文档。删除旧 `internal/webui.Binding`、迁移 Auth/Ops 页面、修改 bootstrap API、调整 Router、样式和构建链都属于非文档实施，必须在本报告之后由用户明确确认 048 计划才能开始。
