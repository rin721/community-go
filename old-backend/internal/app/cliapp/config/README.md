# cliapp config 说明

`config` 负责 CLI 侧配置路径选择、启动前预检、隐私配置修复、配置摘要输出和诊断格式化。它复用 `internal/config` 的真实加载、校验和持久化逻辑，不在 CLI 层维护另一套配置规则。

## 职责边界

- 配置事实来源是 `internal/config`、示例配置和环境变量覆盖规则；本目录只做 CLI 交互适配。
- 启动前预检用于把缺失密钥、生产配置缺口、SQLite 路径和 SMTP 调试配置转成可操作的 CLI 提示。
- 隐私配置写入必须通过受控 helper 调用配置持久化能力，不直接手写 YAML。

## 错误处理

- 配置读取、诊断、持久化和 stdout 摘要写入失败必须返回给 handler。
- 示例配置只读保护必须阻止写入，不得把失败降级为已修复。
- 启动前预检和隐私配置修复完成后的 `ui.Info` 是 CLI 交互事实，写入失败必须返回给 handler，不得把修复结果伪装成已可靠展示。

## 验证命令

修改本目录后至少运行：

```powershell
go test ./internal/app/cliapp/config -count=1 -mod=readonly
go test ./internal/app/cliapp/... -count=1 -mod=readonly
```
