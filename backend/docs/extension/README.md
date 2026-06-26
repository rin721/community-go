# extension 目录说明

`extension` 说明业务扩展方式。当前项目的扩展路径是模块化开发，业务能力通过显式模块装配接入。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `adding-modules.md` | 说明如何在 `internal/modules`、HTTP contract、前端路由、i18n 和测试中新增业务模块。 |
| `module-blueprint.md` | 提供模块接入清单和代码落点蓝图。 |

## 维护规则

- 新业务能力必须通过 `internal/modules`、route contract 和 React 模块化页面扩展；运行路径以当前模块化链路为准。
- 新增主系统 API 必须先进入 `internal/transport/http/contracts.go`，再生成 OpenAPI。
- 模块私有类型留在模块内；只有平台生命周期和跨层契约进入全局 `types`。

## 常用验证

```powershell
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
```
