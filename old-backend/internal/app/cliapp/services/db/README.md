# internal/app/cliapp/services/db 目录说明

本目录承载 `console db` 与 `console db migrate` 命令的应用服务逻辑，位于 CLI handler 与底层 `pkg/database`、`pkg/sqlgen`、`pkg/migrator` 之间。

## 职责

- 将 CLI 解析后的 `OperationOptions` 转换为数据库 DDL 预览、执行或迁移操作。
- 通过 `initapp.NewCore` 与 `initapp.NewDatabase` 复用真实配置和数据库装配。
- 使用 `pkg/sqlgen` 生成数据库级 DDL，使用 `pkg/migrator` 执行 goose 迁移。
- 返回执行结果、生成 SQL 和错误，由 handler 决定如何输出到终端。

## 边界

- 本目录不直接读取环境变量或配置文件内容，配置加载统一由 `initapp` 完成。
- 不承载业务模型、GORM 迁移定义或仓储逻辑；版本化迁移仍归属 `internal/migrations`。
- 不向 handler 暴露底层 GORM 或 `*sql.DB`，迁移执行通过 `pkg/database.SQLDB()` 的受控边界完成。
- 数据库关闭、迁移输出写入和 SQL 执行失败都必须返回给调用方，不得只写日志或静默忽略。

## 扩展方式

新增 `db --operation=<name>` 时：

1. 在命令层补充可见 flag 或参数说明。
2. 在 `RunOperation` 与 `SQLForPrint` 中加入分派逻辑。
3. 将可预览 SQL 放在独立函数中，并为 SQL 生成补测试。
4. 如果需要真实数据库连接，必须复用 `closeDatabaseResource`，确保关闭失败返回给上层。
5. 同步更新 `docs/workflows/db-cli.md`。

新增迁移动作时，应优先扩展 `pkg/migrator` 的稳定能力，再由 `RunMigration` 调用；不要在 CLI 服务层复制 goose 内部逻辑。

## 验证命令

```powershell
go test ./internal/app/cliapp/services/db -count=1 -mod=readonly
```
