# Auth 模块

Auth 是应用组合根选择的横切认证、授权与审计模块，不拥有公开业务 HTTP operation。它通过项目自有 port、middleware 和 `Contribution` 为 HTTP 与业务模块提供认证上下文；第三方 JWT、密码哈希或 session 实现不得泄漏到调用方。

## 当前职责

- 提供 `HTTPMiddleware`、`Access`、`Authorizer`、`Audit` 和 `CredentialVerifier` 等项目契约。
- 在明确的 composition 位置装配认证策略，负责会话/凭据校验、授权结果和审计边界。
- 不创建 Router，不注册公开业务 operation，不把认证模块内部 Adapter 暴露给 Todo 或其它业务模块。

## 变更入口

新增认证方式、凭据字段、会话策略或安全配置前，先阅读[应用模块开发指南](../../../docs/development/application-module-development.md)、[安全响应](../../../docs/operations/security.md)和[文档治理规范](../../../docs/development/documentation-governance.md)，确认 owner、敏感字段、错误语义、生命周期和验证范围。

## 验证边界

认证相关行为需要同时检查 Go 测试、低敏日志和实际配置语义；不能用公开 API 能启动或 WebUI 页面可打开代替授权、过期、失败锁定和审计验证。
