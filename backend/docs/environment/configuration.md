# 配置说明

配置由 `internal/config` 加载和校验。示例配置位于 `configs/config.example.yaml`、`configs/examples/*.example.yaml` 和 `deploy/config.production.example.yaml`；本地派生文件不作为文档事实来源。

## 配置块

| 配置块 | 说明 |
| --- | --- |
| `server` | HTTP 服务监听地址、端口、模式和超时 |
| `webui` | React 静态产物挂载路径、构建目录和公开 base URL |
| `rpc` | JSON-RPC 独立端口，默认关闭 |
| `database` | SQLite、MySQL、PostgreSQL 和连接池 |
| `cache` | disabled/local/redis/hybrid |
| `logger` | 日志级别、格式、输出和滚动文件 |
| `i18n` | 后端 locale 资源路径、默认语言、回退语言 |
| `migration` | goose 迁移目录和自动迁移开关 |
| `brand` | 产品名、产品码、版本名等可替换品牌配置 |
| `storage` | local、S3、MinIO 对象存储 |
| `auth` | 注册策略、密码策略、会话、Cookie、CSRF、MFA、SMTP |
| `cors` | CORS 允许来源、方法、头和凭据 |
| `executor` | 后台执行器开关和池配置 |
| `system` | 系统默认数据补齐和后台维护清理策略 |

## 品牌与产品码

`brand.productName`、`brand.productCode`、认证 issuer/audience、会话 header、存储 bucket、邮件发件名和日志文件名都应通过配置或环境变量覆盖。业务代码不得把项目名、产品名或部署路径写死。

## 环境变量

环境变量按 `APP_<SECTION>_<FIELD>` 形式覆盖。当前默认前缀为 `APP`；如果未来编译期应用前缀不为空，则会扩展为 `<PREFIX>_APP_<SECTION>_<FIELD>`。当前仓库实际示例为：

```powershell
$env:APP_BRAND_PRODUCT_NAME="My Console"
$env:APP_BRAND_PRODUCT_CODE="my-console"
$env:APP_AUTH_ISSUER="my-console"
$env:APP_AUTH_NOTIFICATION_RETRY_INTERVAL_SECONDS="60"
$env:APP_AUTH_NOTIFICATION_RETRY_BATCH_SIZE="20"
$env:APP_AUTH_NOTIFICATION_RETRY_MAX_ATTEMPTS="5"
$env:APP_WEBUI_DIST_DIR="./web/app/build/client"
$env:APP_SYSTEM_MAINTENANCE_CLEANUP_INTERVAL_SECONDS="60"
$env:APP_SYSTEM_MAINTENANCE_CLEANUP_BATCH_SIZE="100"
```

常用变量清单见根目录 `.env.example`。新增配置项时，不得只改 Go 结构或 YAML 示例，必须同步 `.env.example`、部署脚本和验证文档。

新增配置项时必须同步：

1. `internal/config` 结构、默认值、环境变量覆盖和校验。
2. `configs/config.example.yaml`、`configs/examples/*.example.yaml`、`deploy/config.production.example.yaml`。
3. 后端 system locale 标签、相关文档和测试。
