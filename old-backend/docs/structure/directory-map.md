# 目录地图

| 路径 | 说明 |
| --- | --- |
| `cmd/console` | Go 进程入口和 CLI 命令声明 |
| `internal/app` | 应用装配、生命周期、初始化、重载和 CLI service |
| `internal/config` | 配置结构、默认值、环境变量覆盖、校验和持久化 |
| `internal/modules/iam` | 账号、组织、权限、角色、会话、API Token、审计 |
| `internal/modules/system` | 系统配置、菜单、API catalog、操作记录、媒体、版本、参数、字典、探针 |
| `internal/modules/announcements` | 端到端公告业务示例模块，演示模块化扩展路径 |
| `internal/transport/http` | route contract、Gin 路由、OpenAPI、WebUI 静态托管 |
| `internal/transport/rpc` | JSON-RPC 系统方法注册 |
| `internal/middleware` | trace、auth、i18n、CORS、recovery、logging |
| `internal/ports` | 跨装配层和适配层的窄端口 |
| `pkg` | 可复用基础设施库 |
| `types` | 平台级常量、错误和结果封装 |
| `configs` | 默认配置、示例配置、后端 locale |
| `deploy` | 生产配置和 Docker Compose 示例 |
| `docs` | 开发、架构、配置、运行和测试文档 |
| `scripts` | 打包、发布和工程脚本 |
| `web/app` | React 统一前端 |

插件运行时、远程插件协议、插件示例和插件管理页面已删除。新增业务能力应进入 `internal/modules` 和 `web/app` 的对应功能目录。
