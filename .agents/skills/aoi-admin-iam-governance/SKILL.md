---
name: aoi-admin-iam-governance
description: "Repository-specific workflow for IAM authentication and authorization work in this aoi-admin / open console platform repository. Use when changing login, signup, sessions, organizations, users, roles, permissions, menus, Casbin policies, API tokens, MFA, invitations, password reset, email verification, IAM audits, or frontend admin security flows."
---

# Aoi Admin IAM Governance

使用本 skill 处理当前仓库 IAM 认证、授权、组织、用户、角色、权限、菜单、会话、审计、API Token、MFA 和通知相关工作。IAM 变更必须形成后端、route contract、权限目录、前端、i18n、测试和文档闭环。

## 开始前

1. 读取根 `AGENTS.md`、`docs/modules/iam.md`、`docs/modules/system.md`、`docs/modules/permission-matrix.md` 和目标模块 README。
2. 若修改 HTTP API、权限码、请求/响应 DTO 或前端 API client，同时使用 `$aoi-admin-api-contract-sync`。
3. 若修改配置、SMTP、会话策略、Token TTL、MFA 策略或缓存策略，同时使用 `$aoi-admin-config-governance`。
4. 若修改 `web/app` 可见流程、路由守卫、后台页面或 i18n，同时使用 `$aoi-admin-webui-i18n`。
5. 用 `rg` 查调用链，不要根据页面或未验证文档猜测 IAM 能力。

## 边界规则

- `internal/modules/iam/service` 承载用例、权限语义、事务边界和本包最小接口。
- handler 只做输入输出适配；不得在 handler 中写业务规则、权限决策或事务编排。
- service 不直接导入同模块 `repository` 实现、`pkg` 具体基础设施或 `internal/app`。
- Casbin policy、菜单权限和 API catalog 必须从 route contract、系统菜单和 IAM service 的真实规则保持一致。
- 前端不能凭空实现后端未暴露的 IAM 生产能力；缺失能力写入 backlog 或做明确禁用态。
- Token、邀请、重置、验证、审计和通知错误不得被吞掉；底层必须把状态和错误返回上层处理。

## 修改流程

1. 扫描相关 model、migration、repository、service、handler、route contract、前端 endpoint、页面、i18n 和测试。
2. 明确权限范围：平台级、组织级、当前用户级或公开访问，不要用 path 字符串二次推断。
3. API 变更先改 `internal/transport/http/contracts.go`，再注册 handler、更新 DTO、生成 OpenAPI。
4. 菜单或权限变更必须校验 `productCode + scope + permission` 能从 API catalog 或明确菜单能力中找到依据。
5. 事务内只提交本地一致性状态；外部通知、缓存刷新、策略重载等失败必须返回或进入明确补偿流程。
6. 前端页面通过统一 API client 和 TanStack Query/Zustand 状态流，不散落 `/api/v1` 或重复错误归一化。
7. 同步 `docs/modules/iam.md`、权限矩阵、已知缺口和相关 README。

## 重点检查

- 登录、登出、refresh session、`/api/v1/me/session`、`/api/v1/me`、`/api/v1/me/orgs` 是否仍闭环。
- 组织上下文、平台上下文、产品码、客户端类型和审计上下文是否来自配置、请求上下文或 contract。
- 用户、角色、菜单、API Token、MFA 和会话页面是否只展示后端真实字段。
- 邀请、忘记密码、邮箱验证等通知路径是否先保证本地状态一致，再处理外部投递，并把失败暴露给调用方。
- 缓存、policy reload 或通知补偿是否有明确生命周期入口、日志和返回错误边界。

## 验证

按影响范围选择：

```powershell
go test ./internal/modules/iam/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
pnpm --dir web/app test
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

涉及后台可见流程时追加 Playwright 或视觉 QA；涉及发布边界时追加 `$aoi-admin-release-readiness`。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
