# types/result 目录说明

`types/result` 提供统一 API 响应结构和辅助函数，帮助 HTTP handler 返回稳定的 `code`、`messageKey`、`message`、`data`、`traceId` 和分页数据。

## 使用规则

- handler 使用本包包装成功、失败、分页和字段错误响应。
- service 和 repository 不直接构造 HTTP 响应；它们返回业务结果或错误，由 handler 决定响应。
- `messageKey` 必须是稳定 i18n key，前端可通过它做本地化或错误态展示。
- 不得用统一结果包装掩盖底层错误；错误必须沿调用链返回。

## 验证命令

```powershell
go test ./types/result -count=1 -mod=readonly
```
