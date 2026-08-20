# cmd 目录说明

`cmd` 存放可编译进程入口。这里不承载业务逻辑、配置解析细节或运行时装配，只负责把命令行参数、标准输入输出和进程退出码交给应用层处理。

## 当前入口

| 目录 | 用途 |
| --- | --- |
| `console` | 当前后台管理 / 控制台平台的唯一服务与 CLI 入口。 |

## 开发规则

- 新增进程入口前，先确认是否可以通过 `internal/app/cliapp` 的命令扩展完成。
- 入口文件应保持轻薄，只做 `context`、`os.Args`、标准输入输出和退出码适配。
- 不要在 `cmd` 中初始化数据库、缓存、日志、HTTP 路由、业务模块或配置监听。
- 发布、Docker、CI 和文档统一指向 `cmd/console`；入口目录与二进制命名以当前交付面为准。

## 验证命令

```powershell
go run ./cmd/console --help
go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
go test ./cmd/console -count=1 -mod=readonly
```
