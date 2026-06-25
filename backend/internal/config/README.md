# internal/config 目录说明

`internal/config` 负责应用配置结构、默认值、环境变量覆盖、诊断、持久化和运行期更新。它是后端启动链路、CLI 预检、初始化向导和系统配置页面共同依赖的配置事实来源。

## 职责边界

- 定义 `Config` 及各配置块结构，例如 `server`、`database`、`cache`、`storage`、`auth`、`brand`、`webui`、`i18n`。
- 维护默认值、环境变量覆盖、配置文件解析、配置持久化和配置诊断。
- 提供配置 manager，供 `internal/app`、CLI 和初始化中心复用。
- 不承载业务规则，不直接启动数据库、缓存、HTTP 服务或业务模块。

## 错误处理

- `Manager.Update` 用于无失败分支的内存更新；更新闭包内不应执行可能失败的路径映射或业务校验。
- `Manager.UpdateWithError` 用于初始化向导、系统配置页面或 CLI 预检这类可能在更新闭包内发现错误的场景；闭包返回错误时，manager 必须停止验证、持久化和内存替换。
- 配置文件持久化失败、环境变量占位符策略错误和配置校验失败都必须返回给调用方，不得只写日志或继续返回成功。

## 扩展规则

- 新增配置项时，同步更新结构体、默认值、环境变量覆盖、校验/诊断、示例配置、生产配置示例、文档和测试。
- 可运营、可部署、可品牌化或可按产品线变化的策略必须进入配置，不得写死在 handler、service、store 或脚本中。
- 不得恢复插件配置块；新增业务能力通过模块装配和 route contract 接入。
- 本地 `configs/config.local.yaml` 被 Git 忽略，只能作为开发者个人配置，不作为文档或规则事实来源。

## 验证命令

```powershell
go test ./internal/config -count=1 -mod=readonly
go test ./internal/app/initcenter -count=1 -mod=readonly
```
