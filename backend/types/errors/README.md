# types/errors 目录说明

`types/errors` 定义平台级错误码和可识别错误类型，用于 handler、middleware、API client 和文档之间保持一致。

## 归属规则

- 跨层通用错误码放在这里，例如认证失败、权限不足、资源不存在、参数错误、内部错误。
- 模块私有错误优先放在模块 service 内，由 handler 映射为平台错误码。
- 错误值必须保留上层处理所需上下文，不得只写日志后返回成功或空结果。

## 验证命令

```powershell
go test ./types/errors -count=1 -mod=readonly
```
