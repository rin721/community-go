# HTTP API

完整机器可读契约见 `docs/api/openapi.yaml`。该文件由 route contract 生成，不手写维护。

## 通用约定

默认本地服务地址：

```text
http://<CONFIG_HOST>:<CONFIG_PORT>
```

受保护接口使用：

```http
Authorization: Bearer <accessToken-or-api-token>
```

普通 JSON 响应统一封装在 `types/result.Result[T]` 中，包含 `code`、`message`、`data`、`traceId`、`serverTime` 等字段。文件下载接口可返回二进制响应。

## 当前接口面

| 分组 | 路径 | 说明 |
| --- | --- | --- |
| 探针 | `GET /health`、`GET /ready` | 存活与就绪检查 |
| OpenAPI | `GET /openapi.yaml` | 当前主系统 HTTP 契约，不进入 API catalog 和权限同步 |
| Setup | `/api/v1/setup/*` | 初始化 schema、状态、配置测试、运行日志、完成状态 |
| Auth | `/api/v1/auth/*`、`/api/v1/me*`、`/api/v1/invitations/*` | 登录、注册、MFA、找回密码、当前用户、邀请 |
| IAM | `/api/v1/orgs/*`、`/api/v1/iam/notification-outbox*` | 组织、用户、角色、权限、API Token、会话、审计、脱敏通知投递队列和手动重试 |
| Announcements | `/api/v1/announcements*`、`/api/v1/public/announcements*` | 公告后台管理，以及公开只读已发布公告列表和详情 |
| System | `/api/v1/system/*` | 菜单、配置、服务信息、API catalog、操作记录、媒体、版本、参数、字典、流量探针 |

## 维护规则

1. 新增或修改主系统 HTTP API 时，先改 `internal/transport/http/contracts.go`。
2. 真实路由注册必须复用 contract 派生的 route spec，不新增 path/method 二次推断。
3. 运行 `go run ./cmd/console api openapi --output docs/api/openapi.yaml` 更新契约。
4. 运行 `go test ./internal/transport/http -count=1 -mod=readonly` 验证路由与契约一致。
5. 前端 API path 必须集中在 `web/app/app/lib/api/endpoints.ts`。
