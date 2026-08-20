# QA 证据模板

本文档用于记录标准或发布级 QA。小范围代码变更可以只在任务总结中列命令；可见 UI、发布前验收、初始化流程、认证流程和后台关键流程应使用本模板或等价记录。

```md
# QA 证据

## 基本信息

- 日期：
- 验证人：
- 分支：
- 提交 SHA：
- 验证层级：Smoke / Standard / Release
- 变更范围：
- 目标环境：

## 命令验证

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `go test ./internal/config -count=1 -mod=readonly` |  |  |
| `go test ./internal/transport/http -count=1 -mod=readonly` |  |  |
| `go test ./internal/app/... ./internal/modules/... -count=1 -mod=readonly` |  |  |
| `go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console` |  |  |
| `pnpm --dir web/app theme:check` |  |  |
| `pnpm --dir web/app lint` |  |  |
| `pnpm --dir web/app typecheck` |  |  |
| `pnpm --dir web/app lint:i18n` |  |  |
| `pnpm --dir web/app test` |  |  |
| `pnpm --dir web/app test:e2e` |  |  |
| `pnpm --dir web/app build` |  |  |
| `git diff --check` |  |  |

## 运行态烟测

| 路径 | 结果 | 备注 |
| --- | --- | --- |
| `/health` |  |  |
| `/ready` |  |  |
| `/openapi.yaml` |  |  |
| `/` |  |  |
| `/setup` |  |  |
| `/admin` |  |  |

## 可见 UI 检查

| 页面或流程 | 视口 | 结果 | 备注 |
| --- | --- | --- | --- |
|  | `1440x900` |  |  |
|  | `390x844` |  |  |

检查项：

- 页面标题、主标题、语言属性和焦点状态：
- 加载状态：
- 空状态：
- 错误状态：
- 无权限状态：
- 表单校验与提交反馈：
- 表格、筛选、分页：
- 弹窗、抽屉或菜单：
- 文本溢出：
- i18n 文案：

## 可观测性

- `/ready` 状态：
- 后台探针页：
- 服务器指标历史：
- 操作记录：
- 错误日志：
- trace id 示例：
- 流量探针：
- 已知 best-effort 路径：

## 工具或环境限制

- 未运行命令：
- 原因：
- 影响范围：
- 目标环境补充验证方式：

## 结论

- 通过项：
- 失败项：
- 已知风险：
- 后续处理：
```
