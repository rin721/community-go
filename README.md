# go-scaffold-template / community-go

构建期仓库布局由 `.scaffold/layout.json` 统一声明；WebUI、代码生成、工具和 release 脚本不得各自复制路径约定。

当前仓库 remote 是 `rin721/community-go`，根 Go module 和构建产物仍使用 `go-scaffold-template` 身份；这个身份差异已记录在[项目范围与当前状态](docs/repository-scope.md)，最终身份迁移不在本次文档治理中。根 Go 工程使用显式 composition root 串联配置、日志、数据库、迁移、HTTP、management、后台任务、定时调度、消息系统和业务模块；当前默认应用包含 IAM、Organization、Navigation 与 Todo 垂直切片。

## 当前项目目标语境（Agent 必读）

当前项目处于**第一个正式版本发布前的工程成型期**。目标是把 `community-go` 建成一套可直接复制、继续开发和独立拥有源码的生产级 Go 全栈应用脚手架，而不是维护一个已经上线的业务系统，也不承担尚不存在的外部数据库、API 或配置升级兼容承诺。

- `origin/main` 是共享开发基线，不等于正式 release；只有后续经明确确认产生的首个正式 tag/release 才冻结首发 migration、API 和配置兼容基线。
- 首发前发现模块归属、schema 或命名错误时，优先形成干净、单轨的当前 baseline，不为未发布历史增加永久兼容层；Git 与 `docs/changes/` 保存演进证据。
- “首发前可重整 baseline”不授权删除本地数据库、配置或其他用户数据。任何重建都必须先只读确认目标、说明损失与恢复方式，并获得当次明确授权。
- Todo 是当前默认保留、可完整删除的学习型业务垂直切片，不是 Kernel 或任何其它业务模块的底座依赖。是否移除 Todo 属于产品范围决策，不能由 migration 或实现便利性暗中决定。
- 研究和计划必须区分当前已实现、首发目标与未来设想。详细范围、身份差异和交付状态以[项目范围与当前状态](docs/repository-scope.md)为当前 authority。

## 五分钟本地启动

前置条件：安装仓库要求的 Go 版本，并在仓库根目录执行命令：

```powershell
go run ./cmd/app config init
go run ./cmd/app db migrate up
go run ./cmd/app
```

启动成功后，日志中应能看到 `application generation started` 与 `application ready`。默认 management readiness 地址：

```powershell
Invoke-RestMethod http://127.0.0.1:9090/readyz
```

停止服务使用 `Ctrl+C`，正常退出会打印 draining/stopped 相关日志。

## 全栈 WebUI 启动（两种模式）

根 `webui/` 是当前质量链已接入的 Admin WebUI，由 `config.yaml` 的 `webui.hosting.enabled` 选择运行模式（默认 `true`）：

- **模式 B（默认）：Go 服务单进程托管**——Go Service 在业务 listener 同时提供页面与 API，浏览器访问一个地址；
- **模式 A：前后端分离开发模式**——Vite dev server 提供页面并代理 API/management，适合需要 HMR 的联调。

### 模式 B：Go 服务托管（默认）

首次启动需要先生成配置、迁移数据库并装配 WebUI 产物；development 环境产物缺失时，Service 启动前会自动执行托管前构建脚本（node：registry 生成 -> 依赖安装 -> 构建打包），因此最小启动路径为：

```powershell
$env:APP_IAM__LOCAL__SETUPTOKEN = "change-me-before-use"
go run ./cmd/app config init
go run ./cmd/app db migrate up
go run ./cmd/app
```

浏览器访问 `http://127.0.0.1:8080` 完成首次设置；页面深链（如 `/dashboard`）回退到 SPA，`/api` 与 `/management` 路径保持 JSON 语义。需要显式重建产物时执行 `go run ./cmd/app webui build`。生产环境（`logger.environment: production`）缺产物会快速失败，镜像构建期必须装配好 `webui/dist`，运行时容器不含 node。

### 模式 A：前后端分离（Vite HMR）

把 `config.yaml` 的 `webui.hosting.enabled` 改为 `false`，按[WebUI 本地启动指南](docs/getting-started/webui.md)在两个终端分别启动 Go Service 与 Vite（本地 HTTPS，`https://127.0.0.1:5173`），完整步骤与常见问题见该指南。

两种模式共用同一套 IAM Session/CORS 语义：同源请求不依赖 `http.cors.allowedOrigins` 白名单；Session Cookie 带 `Secure` 属性，纯 HTTP 只对 loopback（localhost/127.0.0.1）有效，非 loopback 部署必须由 TLS 终结的反向代理承载。

模式 B 下可检查当前宿主、manifest 和 IAM/Organization/Navigation/Ops 页面。IAM 已拥有本地账号、凭据、Session、Core RBAC、用户/角色/权限管理及独立 migration set；Organization 已拥有部门、岗位和账号组织分配，但组织关系不进入权限决策；Navigation 只管理代码已注册菜单的启停、父级和排序，禁用菜单不注销路由或改变服务端授权；Auth 只保留通用 Principal、JWT、operation decision 和审计。启动后可按 [首次使用与最小验收](docs/getting-started/first-use.md) 验证当前可用的 WebUI 宿主、Todo CLI/API 和 management readiness；两种模式的切换与产物装配细节见 [WebUI 本地启动指南](docs/getting-started/webui.md)。

如果本地已经存在 `config.yaml`，`config init` 会拒绝覆盖。不要为了“重新生成”随手使用 `--force`；需要对比时先输出到临时路径，详细关系见 [本地启动指南](docs/getting-started/local-development.md) 与 [配置说明](docs/configuration/README.md)。

## 项目手册

完整文档从 [docs/README.md](docs/README.md) 进入，按项目真实使用路径连续组织：认识项目、启动项目、使用能力、开发业务、接入基础设施、理解架构、扩展能力、调试排障、运行维护和深入底层设计。

| 阅读节点 | 入口 |
| --- | --- |
| 本地启动与首次迁移 | [本地启动指南](docs/getting-started/local-development.md) |
| 项目范围、当前实现与未决边界 | [项目范围与当前状态](docs/repository-scope.md) |
| WebUI、Todo/API 和 management 首次验收 | [首次使用与最小验收](docs/getting-started/first-use.md) |
| 配置来源、环境变量和默认配置生成 | [配置说明](docs/configuration/README.md) |
| 应用模块、日志、执行、调度和消息开发 | [开发指南](docs/development/README.md) |
| Kernel、Application Generation 和模块边界 | [架构说明](docs/architecture/README.md) |
| 通用能力选型、第三方边界与架构复核 | [技术选型与架构复核基线](docs/architecture/technology-selection.md) |
| API 路由与契约生成结果 | [API 文档](api/README.md) |
| 构建、迁移、发布、复制、安全、排障和运行维护 | [运维文档](docs/operations/README.md) |
| 当前运行能力、外部资源和验证状态 | [运行能力矩阵](docs/operations/runtime-capabilities.md) |
| 研究快照与任务证据 | [研究档案](docs/research/README.md)、[变更记录](docs/changes/README.md) |

## 架构摘要

应用入口 `cmd/app` 只负责进程 I/O、基线日志和信号处理；`internal/composition` 显式装配 Bootstrap CLI、migration one-shot 与长期 Service。长期 Service 使用 Application Generation 管理配置快照、资源复用、listener、定时任务与消息 Consumer 准入交接、ready 状态和优雅停止。

配置严格按 owner 注册，未知配置节会在资源副作用前失败；`config init`、`db migrate` 和长期 Service 必须识别同一套应用配置节，避免“生成的配置自己不能启动”的漂移。

日志是开发必备能力。开发阶段默认可见 debug 级别日志，业务和基础设施代码必须遵守 [开发日志规范](docs/development/logging.md)，在真正决定处理策略的边界记录，避免泄露凭据或重复打印同一错误链。

## 文档权威边界

- 当前怎么启动、配置、开发和运维，以根 README 与 [项目手册](docs/README.md) 下的主题文档为准。
- `docs/changes/**` 保存任务级研究、计划、实施和验证证据，不替代当前主题文档。
- `docs/research/**` 保存阶段性研究快照，不把目标设计写成已经实现的能力。
- `pkg/**/README.md` 与 `internal/**/README.md` 是局部包说明，由主题文档链接进入，不作为全局阅读入口。
- `old-backend/` 是本次文档治理明确排除的目录，不属于当前 authority、链接图或质量门禁。
- 新增或修改能力时，必须按[文档治理规范](docs/development/documentation-governance.md)评估对应主题，并提交文档影响记录；局部 README 只保留本包或本模块的实现边界和到 authority 的链接。

## License

Copyright 2026 Rin721.

This project is licensed under the Apache License 2.0.

You are free to use, modify, distribute, and use this project
for commercial purposes subject to the terms of the license.

See [LICENSE](./LICENSE) and [NOTICE](./NOTICE) for details.
