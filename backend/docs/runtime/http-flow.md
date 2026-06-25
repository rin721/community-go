# HTTP 流程

HTTP 服务由 `pkg/httpserver` 管理，路由由 `internal/transport/http` 注册。

## 路由优先级

| 路径 | 处理方 |
| --- | --- |
| `/health`、`/ready` | 探针 handler |
| `/openapi.yaml` | OpenAPI handler |
| `/api/v1/setup/*` | 初始化 handler |
| `/api/v1/auth/*`、`/api/v1/me*` | IAM auth handler |
| `/api/v1/orgs/*` | IAM 组织域 handler |
| `/api/v1/system/*` | System handler |
| `/`、公开页面、`/setup/**`、`/admin/**` | React SPA |

SPA fallback 显式排除 `/api`、`/api/v1`、`/health`、`/ready` 和 `/openapi.yaml`，避免 API 请求被前端路由吞掉。

## 权限与记录

- IAM 认证中间件从 access token 或 API token 中恢复 principal。
- 受保护的 System/IAM 路由由 route contract 中的 permission 元数据授权。
- 操作记录中间件只记录受保护后台 API，并对敏感字段脱敏。
- API catalog 来自 route contract registry，不扫描真实路由树或目录结构。
