---
name: aoi-admin-error-result-governance
description: "Repository-specific workflow for backend result envelopes, error codes, i18n message keys, validation errors, ApiError handling, state propagation, and no-error-swallowing rules in this aoi-admin / open console platform repository. Use when changing types/result, types/errors, handlers, services, repositories, tool libraries, frontend API client errors, or docs/architecture/error-result-contracts.md."
---

# Aoi Admin Error Result Governance

使用本 skill 处理错误、结果、状态和响应契约。目标是让底层返回事实，上层决定响应、重试、降级、日志或用户提示，避免工具库、repository、service 或前端页面吞掉错误。

## 开始前

1. 阅读 `AGENTS.md`、`types/README.md`、`types/result/README.md`、`types/errors/README.md`、`docs/architecture/error-result-contracts.md` 和目标模块 README。
2. 用 `rg` 查 `types/result`、`types/errors`、`messageKey`、`messageArgs`、`ApiError`、`errors.Join`、`_ =`、`logger.*Error` 和目标调用链。
3. 判断错误属于平台级通用错误、模块私有错误、字段校验错误、网络错误、权限错误、状态持久化错误还是 best-effort 清理。
4. 若涉及 HTTP route contract、前端 API client、配置或 WebUI 文案，同时使用对应专项 skill。

## 后端规则

- API handler 使用 `types/result` 统一响应，不返回散落结构、裸字符串或临时 `map[string]any` 响应。
- `types/errors` 只放平台级通用错误码；模块私有错误留在模块内部，由 handler 映射为稳定错误码和 i18n `messageKey`。
- 字段级错误必须保留字段上下文；用户可见错误通过 `messageKey` 和 `messageArgs` 表达。
- service、repository、infrastructure、`pkg` 和脚本辅助库必须返回错误、结果和状态；日志不能替代错误返回。
- 原始操作失败且回滚、关闭、恢复或状态落盘也失败时，使用 `errors.Join` 保留所有关键错误。
- best-effort 只能用于不影响业务正确性的清理、缓存降级或统计输出，并在代码或文档中说明边界。

## 前端规则

- 后台 API 错误统一通过 `ApiError` 和 `app/lib/api` 处理，不在页面中重复实现不一致的错误归一化。
- 页面区分网络错误、权限错误、业务错误、字段错误、加载态和空状态。
- 用户可见错误文案进入 `web/app/app/i18n/locales/zh-CN.json` 与 `en-US.json`。
- 不要用前端本地 mock 把后端未暴露的生产能力写成真实可用。

## 修改顺序

1. 先确定错误事实来源和调用边界。
2. 在最靠近事实的位置返回错误或状态，不替上层决定业务行为。
3. 在 handler、CLI output 或前端 API client 中统一转换为用户可见结果。
4. 补测试覆盖失败路径、聚合错误和字段上下文。
5. 同步错误契约文档、目录 README、i18n 或 API 文档。

## 验证

按影响范围选择：

```powershell
go test ./types/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go test ./internal/... -count=1 -mod=readonly
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
pnpm --dir web/app test
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
git diff --check
```

如果只修改文档或 skill，至少运行 `scripts/check-agent-skills.ps1`、相关 README 检查和 `git diff --check`。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
