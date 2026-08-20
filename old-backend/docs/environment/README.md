# environment 目录说明

`environment` 记录配置文件、环境变量和运行时配置入口。它是部署前理解配置来源和覆盖规则的入口。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `configuration.md` | 说明配置文件、环境变量前缀、认证、系统维护、通知、存储、i18n 等配置项。 |

## 维护规则

- 新增或修改配置项时，同步 `internal/config`、默认值、示例配置、生产配置模板、后端 i18n 标签和本文档。
- 不把 `configs/config.yaml` 或本地派生配置当作生产事实来源。
- 可变品牌、认证、安全、缓存、存储和部署策略必须走配置，不写死到业务代码或前端页面。

## 常用验证

```powershell
go test ./internal/config -count=1 -mod=readonly
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
```
