# workflows 目录说明

`workflows` 记录面向开发者和运维人员的 CLI 操作流程。它描述当前命令如何使用，不保存自动化脚本本体。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `iam-cli.md` | IAM 相关 CLI 工作流，例如账号、角色、权限或初始化辅助命令。 |
| `db-cli.md` | 数据库迁移、状态检查和迁移执行工作流。 |

## 维护规则

- CLI 文档必须对应当前 `cmd/console` 命令，不恢复旧命令名。
- 涉及数据库迁移的命令必须提醒先检查状态、备份和目标配置。
- 新增 CLI 子命令时同步这里、`scripts/README.md` 和相关模块文档。

## 常用验证

```powershell
go run ./cmd/console --help
go run ./cmd/console db migrate status --config=<配置路径>
```
