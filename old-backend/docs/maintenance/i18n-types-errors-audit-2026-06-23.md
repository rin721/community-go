# i18n、类型、错误与结果封装审计：2026-06-23

本文记录第八阶段“i18n、注释、类型定义、错误处理、结果封装”的本轮审计和收口。结论以当前 `types`、前端 i18n、API client、错误/结果测试和文档为依据。

## 审计范围

- `types`
- `types/auth`
- `types/constants`
- `types/errors`
- `types/result`
- `web/app/app/i18n`
- `web/app/app/lib/api/client.ts`
- `web/app/app/lib/api/client.test.ts`
- `docs/architecture/error-result-contracts.md`
- `AGENTS.md`

## 真实状态

| 主题 | 当前事实 |
| --- | --- |
| 全局类型层 | `types` 当前只包含平台常量、认证上下文、错误码/业务错误类型和统一响应结果。 |
| 导入边界 | `types/import_boundary_test.go` 禁止 `types` 导入 `internal` 或 `pkg`，避免全局类型层反向依赖业务和基础设施。 |
| 错误码 | `types/errors` 定义跨层通用错误码范围，handler 通过稳定 `messageKey` 和 `messageArgs` 表达具体错误语义。 |
| 结果封装 | `types/result` 统一 `code`、`messageKey`、`message`、`messageArgs`、`data`、`traceId`、`serverTime` 和分页结构。 |
| 前端错误处理 | API client 会把 HTTP 非 2xx、后端 `Result.code != 0`、网络失败、坏 JSON 和 HTML fallback 归一成 `ApiError`，主动取消请求的 `AbortError` 保持原样抛出。 |
| i18n | 前后端 canonical locale 为 `zh-CN`、`en-US`；前端只保留浏览器语言和旧本地值到 canonical locale 的输入归一化，不恢复 `en` 资源目录或 API 传递双轨。 |

## 发现的问题

| 类型 | 问题 | 处理 |
| --- | --- | --- |
| 类型层漂移 | `types/errors` 文档声明只承载平台级错误码，但代码中仍保留未被使用的 `ErrDuplicateUsername`、`ErrUserNotFound` 等具体 IAM 语义错误码。 | 删除未使用的模块私有错误码，并新增测试防止这类错误码回到全局错误层。 |
| 结果封装缺陷 | `types/result.NewPageResult` 直接用 `pageSize` 除法，调用方传入 `0` 时会 panic。 | 在 `pageSize <= 0` 时返回 `totalPages=0` 并保留调用方上下文，避免结果 helper 制造运行时崩溃。 |
| 文档漂移 | 长期规则对 locale 映射的描述过于绝对，容易把浏览器语言输入归一化误读为资源/API 双轨。 | 更新 `AGENTS.md`，明确只允许入口归一化，不得恢复 `en` 资源目录、后端 locale 或 API 传递双轨。 |
| 注释漂移 | `types/result` 注释示例仍使用 `UserResponse`、`ProductResponse` 这类具体业务命名。 | 改为中性 `ItemResponse` 和“模块自己的响应 DTO”。 |

## 本轮变更

- 删除 `types/errors/codes.go` 中未使用的具体用户/邮箱错误码：
  - `ErrInvalidUsername`
  - `ErrInvalidEmail`
  - `ErrInvalidPassword`
  - `ErrDuplicateUsername`
  - `ErrDuplicateEmail`
  - `ErrUserNotFound`
- 新增 `TestGlobalErrorCodesStayPlatformLevel`，防止模块私有错误码重新进入 `types/errors`。
- 修正 `types/result.NewPageResult` 在 `pageSize <= 0` 时的除零风险。
- 补充分页结果测试，验证无效 `pageSize` 不 panic，并保留调用方传入的分页上下文。
- 更新根 `AGENTS.md`：
  - 固定 `types/errors` 只允许平台级通用错误码。
  - 修正 canonical locale 与输入归一化的边界说明。
- 更新 `docs/architecture/error-result-contracts.md`，补充全局错误码收窄和分页 helper 边界。

## 架构影响

本轮进一步收窄全局 `types` 层职责：全局错误码只表达跨层通用分类，具体业务或模块语义留在模块内部，由 handler 通过 `messageKey`、`messageArgs` 和通用错误码映射给前端。这样可以避免新增业务模块时把私有状态、私有错误或业务命名扩散到平台级契约。

`NewPageResult` 的变化不会替代上层参数校验；它只保证结果 helper 自身不会因无效输入 panic。API 层仍应继续在 handler 或 service 中返回明确参数错误。

## 验证命令

```powershell
go test ./types/... -count=1 -mod=readonly
pnpm --dir web/app exec vitest run app/i18n/locales.test.ts app/lib/api/client.test.ts
pnpm --dir web/app lint:i18n
```

结果：本轮验证通过。

## 剩余风险

- “所有工具库都不吞错”无法通过一次轻量扫描完全证明；后续新增或重构 `pkg`、repository、service 时仍必须按 `docs/architecture/error-result-contracts.md` 执行局部审查和测试。
- 初始化、IAM 和 Announcements 的已知 best-effort 路径仍需要持续分级治理；IAM 授权策略重载已接入生命周期后台重试，邀请、忘记密码和邮箱验证已保证本地 token、审计与 `iam_notification_outbox` 事务先于通知投递完成，投递失败会进入后台补偿并向调用方返回错误；System 媒体与探针清理已接入后台维护任务，清理间隔和批量大小已配置化，但仍需目标环境观测。当前文档已在错误与结果契约中列出边界。
- 前端 API client 的错误归一化已有单元测试，但页面级错误态和无权态仍需按视觉 QA 模板继续扩展截图证据。

## 后续规则

- 新增全局错误码前必须确认它是平台级跨层契约；模块私有错误优先放在模块 service 内。
- 新增 API 必须返回稳定 `messageKey`，字段上下文放入 `messageArgs`。
- 新增前端请求必须通过 API client，不在页面中手写 `fetch` 或自定义错误归一化。
- 新增 locale 资源只使用 canonical `zh-CN`、`en-US`，旧输入值只能在 locale 入口做归一化。
