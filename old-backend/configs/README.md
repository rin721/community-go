# configs 目录说明

`configs` 存放默认配置示例、场景化配置示例、后端 i18n 资源和可替换的静态占位资源。这里是开发者理解配置项和环境变量覆盖关系的入口，不是本地运行态事实来源。

## 目录与文件

| 路径 | 用途 |
| --- | --- |
| `config.example.yaml` | 本地开发和默认运行的配置示例，所有新增配置项都应同步到这里。 |
| `examples/` | 按场景拆分的配置示例，例如 SQLite 调试、MySQL + Redis、PostgreSQL 生产风格、SMTP、存储媒体。 |
| `locales/` | 后端、CLI、初始化向导和 API 响应使用的 `zh-CN`、`en-US` YAML i18n 资源。 |
| `logo.png` | 可替换的中性图片占位资源，不应承载固定品牌名。 |
| `config.local.yaml` | 本地派生配置，若存在也不作为开源交付事实来源。 |

## 配置规则

- 可变产品名、产品码、认证策略、Cookie/Header 名称、存储、缓存、数据库、i18n 和 WebUI 行为应进入配置结构或环境变量覆盖，不要写死在业务代码或前端页面。
- 新增配置项必须同步 `internal/config` 结构与校验、`config.example.yaml`、`examples/*.yaml`、`deploy/config.production.example.yaml`、`.env.example` 和相关文档。
- 生产环境应基于 `deploy/config.production.example.yaml` 派生真实配置，并通过环境变量或密钥系统注入敏感值。
- 不要提交真实密钥、连接串、Token、Cookie、生产域名或本地私有路径。

## i18n 资源

后端资源位于：

```text
configs/locales/{ui,api,validation,system}/{zh-CN,en-US}.yaml
```

新增后端、CLI、初始化或 API 可见文案时，必须同步 `zh-CN` 和 `en-US`，并按命名空间放置。

## 验证命令

```powershell
go test ./internal/config -count=1 -mod=readonly
go test ./pkg/i18n ./internal/config -count=1 -mod=readonly
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
```
