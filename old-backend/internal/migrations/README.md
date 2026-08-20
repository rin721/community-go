# internal/migrations 目录说明

`internal/migrations` 存放 goose 数据库迁移，是数据库结构演进的事实来源。迁移由 CLI、初始化流程和生产部署流程复用。

## 维护规则

- 已共享的迁移视为 append-only，不修改历史迁移内容，不通过删除旧迁移修复线上数据结构。
- 新增迁移文件使用时间戳前缀，语义清晰，例如 `20260622000100_create_announcements.sql`。
- 迁移只表达数据库结构和必要历史回填，不承载运行时业务逻辑。
- 删除功能时，先确认当前开源版本是否需要保留历史数据兼容。已移除的插件系统不再新增迁移。

## 验证命令

```powershell
go test ./pkg/migrator ./internal/app/initcenter -count=1 -mod=readonly
go run ./cmd/console db status --config=configs/config.example.yaml
```

`db status` 需要本地数据库配置可用；默认示例使用 SQLite，并会在 `data/` 下创建本地文件。
