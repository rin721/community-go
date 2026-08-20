# runtime 目录说明

`runtime` 说明应用启动、HTTP 请求、配置流和错误流。它帮助开发者从运行链路理解代码，而不是只看静态目录。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `startup-flow.md` | 从命令入口到应用装配、服务启动和资源关闭的流程。 |
| `http-flow.md` | HTTP 请求从路由、中间件、handler 到 service/repository 的流转。 |
| `config-flow.md` | 配置加载、默认值、环境变量覆盖和运行时配置管理。 |
| `error-flow.md` | 错误从底层返回到 API 响应、前端请求和日志的处理路径。 |

## 维护规则

- 修改启动流程、HTTP 中间件、配置加载、错误封装或应用生命周期时同步本目录。
- 运行链路文档必须对应真实入口和调用链，不描述旧命令或已删除插件路径。
- 错误流文档必须坚持“底层返回，上层处理”，不能用日志替代错误返回。

## 常用验证

```powershell
go test ./internal/config ./internal/transport/http -count=1 -mod=readonly
go test ./... -count=1 -mod=readonly
```
