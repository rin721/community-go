# deploy 目录说明

`deploy` 存放生产风格配置模板和 Compose 示例。这里提供的是可审查、可复制的部署起点，不是生产发布保证；真实环境必须补齐数据库、密钥、备份、回滚和可观测性证据。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `config.production.example.yaml` | 生产风格应用配置模板，默认通过环境变量注入数据库、缓存、认证密钥、品牌、存储和 WebUI 配置。 |
| `docker-compose.production.example.yml` | Compose 服务示例，包含服务端口、数据目录、日志目录、健康检查和环境变量映射。 |

## 使用方式

1. 复制 `config.production.example.yaml` 到目标环境配置目录。
2. 通过环境变量或密钥系统注入数据库、认证密钥、缓存和存储配置。
3. 构建或拉取 `console-platform` 镜像。
4. 使用 Compose、`deploy.sh` 或 CI/CD 系统启动服务。
5. 验证 `/health`、`/ready`、`/openapi.yaml`、`/`、`/setup` 和 `/admin`。

## 安全边界

- 不要把生产密钥写入本目录。
- 不要把 SQLite smoke 配置直接用于生产环境。
- 不要恢复旧部署变量、旧入口、旧品牌名或插件运行时配置。
- 数据库迁移、备份、回滚和发布后观察必须写入发布证据。

## 验证命令

Windows 目标环境：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

Linux、macOS 或 CI 环境：

```bash
bash scripts/docker-smoke.sh
```

发布证据模板：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
```
