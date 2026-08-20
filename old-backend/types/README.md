# types 目录说明

`types` 只放平台级共享类型，不承载具体业务模型。

## 当前内容

- `constants`：应用生命周期、配置入口、运行时契约等平台常量。
- `auth`：跨层认证主体和权限判断上下文。
- `errors`：跨层可识别的错误码和错误类型。
- `result`：统一 API 结果辅助与响应包装。

## 归属规则

- 业务实体、请求 DTO、领域状态和模块内枚举优先放在对应模块内部。
- 只有跨模块、跨层、应用生命周期或传输契约确实共享的类型才进入 `types`。
- `types` 不得导入 `internal`，不得依赖具体基础设施实现。
- 错误和结果辅助只能表达通用契约，不替上层决定业务行为。
- `types/result` 的 `messageKey` 必须是稳定 i18n key；字段级错误通过 `messageArgs` 返回给调用方。
- 新增错误码前先确认是否为跨层契约。模块私有错误优先放在模块 service 内，由 handler 映射成平台错误码。

## 错误与结果契约

详细规则见 `docs/architecture/error-result-contracts.md`。新增 API 时应同时检查：

- handler 是否使用统一 `result` helper。
- 服务层错误是否向上返回，而不是只写日志。
- 参数解析错误是否保留字段名、限制值等上下文。
- 前端 API client 是否能通过 `ApiError` 读取 `status`、`code`、`messageKey`、`traceId`。

## 验证命令

该命令会同时检查 `types` 顶层包集合是否仍为 `auth`、`constants`、`errors`、`result`，新增模块私有类型时应放回对应 `internal/modules/<module>`。

```powershell
go test ./types/... -count=1 -mod=readonly
```
