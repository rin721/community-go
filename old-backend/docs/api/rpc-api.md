# JSON-RPC API

JSON-RPC 是独立监听入口，默认关闭。启用后由 `internal/transport/rpc` 注册系统方法，由 `pkg/rpcserver` 提供 HTTP 服务。

```yaml
rpc:
  enabled: true
  host: 127.0.0.1
  port: 10099
```

## 当前系统方法

- `system.ping`
- `system.methods`

当前 RPC 层不承载插件协议。新增 RPC 系统方法时，应同步本文档、RPC 测试和调用方文档。
