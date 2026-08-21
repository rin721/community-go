# 首次使用与最小验收

本文回答“进程启动后如何确认当前应用真的可用”。启动前置条件和配置来源分别见[本地启动指南](local-development.md)、[WebUI 本地启动指南](webui.md)和[配置说明](../configuration/README.md)。

## 1. 验证 management readiness

Go 服务启动后，从仓库根目录执行：

```powershell
Invoke-RestMethod http://127.0.0.1:9090/readyz
```

返回成功表示当前 generation 已通过 readiness；失败时回到日志、配置和[运行能力矩阵](../operations/runtime-capabilities.md)，不要用 WebUI 页面是否能打开代替后端就绪判断。

## 2. 检查 Admin WebUI 宿主

1. 按[全栈 WebUI 本地启动](../../README.md#全栈-webui-本地启动)启动 Go 服务和 Vite。
2. 打开 `https://127.0.0.1:5173`。
3. 确认宿主能加载当前 manifest，且静态 registry 的 `catalogRevision` 匹配；菜单策略使用独立 `navigationRevision`。
4. 使用临时或已明确选择的 fresh database 执行 `db migrate up`，确认 `iam` 与 `todo` 两个 set 均兼容；默认 `.data/app.db` 不会被 Agent 自动重置。
5. 通过 `/setup` 原子创建首个 owner，随后验证登录、账号安全、用户、角色和权限页面；setup token 不得写入仓库、截图、日志或前端公开配置。

Vite 本地 HTTPS 的证书提示属于开发环境行为。IAM typed HTTP、Origin/CSRF 与阶段边界以[WebUI 本地启动指南](webui.md)与 `webui/` 代码为准。

## 3. 验证 Todo CLI

CLI 需要后端配置和数据库迁移已经完成。常用命令：

```powershell
go run ./cmd/app todo create --subject "first task" --scopes "local"
go run ./cmd/app todo list --scopes "local"
go run ./cmd/app todo get --id <todo-id> --scopes "local"
go run ./cmd/app todo complete --id <todo-id> --scopes "local"
```

实际 flag 以 `go run ./cmd/app todo --help` 和子命令 help 为准；命令失败时必须保留退出错误，不以空列表或默认值掩盖配置、数据库或授权问题。

## 4. 验证公开 API

公开 HTTP operation 的当前路径、security 和 schema 以 [`api/openapi.yaml`](../../api/openapi.yaml) 为准。新增或修改 operation 后，从根目录运行：

```powershell
go generate ./...
git diff --exit-code -- api internal/transport/http/api
```

这只验证契约生成结果稳定；真实 API 调用仍需要按照当前 setup、会话和数据库状态执行，不把生成检查冒充运行时验收。

## 5. 验收边界

- 本文不覆盖浏览器 E2E、视觉验收、真实 Redis、对象存储、RabbitMQ、PostgreSQL/MySQL 或生产部署；这些属于对应主题的独立证据。
- 当前 WebUI 是本地 Vite 开发交付，Docker/release 尚未证明会托管 `webui/dist`。
- 测试数据和 setup 账号仅用于本地验收，不能写入提交、日志或共享环境。
