# internal/middleware 目录说明

`internal/middleware` 存放 HTTP 传输中间件，负责在请求进入 handler 前后处理认证、语言、CORS、日志、恢复、限流和 trace 上下文。

## 职责边界

- 中间件只处理传输层横切逻辑，不承载业务用例。
- 认证中间件负责解析会话、API Token、CSRF 和请求上下文；权限语义仍由 route contract、IAM 和 handler/service 共同闭环。
- i18n 中间件负责语言识别和上下文注入，不新增散落语言列表或资源路径。
- recovery/logger/trace 中间件负责可观测性和错误响应，但日志不能替代错误返回。

## 扩展规则

- 新增中间件必须通过 `internal/transport/http` 或 `internal/app` 装配，不要在模块 handler 内临时包裹。
- 中间件需要配置时，从 `internal/config` 注入，不直接读取 `os.Getenv`。
- 可复用的底层能力放在 `pkg`，中间件只做本应用传输适配。
- 中间件只依赖 `internal/ports` 和 `types/auth` 等平台契约，不直接导入业务模块 service。
- 不得按 URL 前缀二次推断权限或产品归属，主系统 API 归属以 `internal/transport/http/contracts.go` 为准。

## 验证命令

```powershell
go test ./internal/middleware ./internal/transport/http -count=1 -mod=readonly
```
