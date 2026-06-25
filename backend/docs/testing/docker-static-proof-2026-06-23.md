# 2026-06-23 Docker 与部署静态链路证明

本文记录在当前机器缺少 Docker CLI 时，对容器构建、部署脚本、CI 和发布包路径做的静态一致性审查。它不能替代真实 `docker build` 和容器运行烟测，只用于证明当前交付文件已经指向新的应用入口、静态产物目录和模块化平台结构。

## 审查范围

- `Dockerfile`
- `deploy/docker-compose.production.example.yml`
- `deploy/config.production.example.yaml`
- `deploy.sh`
- `script/install.sh`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-remote.yml`
- `scripts/package.py`
- `scripts/docker-smoke.ps1`
- `scripts/docker-smoke.sh`
- `configs/*.example.yaml`

## 环境限制

当前机器无法执行 Docker 命令：

```powershell
docker --version
```

结果：

```text
docker : The term 'docker' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

因此，本轮没有声明 Docker 镜像构建或容器运行通过。发布前仍需在具备 Docker 的环境补跑真实容器验证。

当前 Windows 机器也缺少 Bash，因此 Bash 入口只做静态检查，真实运行交给 Linux CI 或具备 Bash 与 Docker 的目标环境。

本轮已新增目标环境可执行脚本：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

```bash
bash scripts/docker-smoke.sh
```

当前机器执行 PowerShell 脚本仍失败于 Docker CLI 缺失；Bash 脚本在本机缺少 Bash 和 Docker，不能声明运行通过。详细记录见 [2026-06-23 Docker 容器烟测脚本审计](../maintenance/docker-smoke-script-audit-2026-06-23.md)。

## 静态链路结论

容器、CI、部署和打包链路当前已经统一到以下有效路径：

| 链路 | 当前事实 |
| --- | --- |
| 前端构建 | `Dockerfile` 使用 Node 24，在 `web/app` 内执行 `pnpm build`，并检查 `build/client/index.html` 存在 |
| 后端构建 | `Dockerfile` 与 CI 均构建 `./cmd/console`，输出二进制名为 `console-server` |
| 运行入口 | 容器入口为 `/app/console-server server --config=/app/configs/config.yaml` |
| WebUI 静态产物 | 容器与发布包均使用 `web/app/build/client` |
| 生产配置 | 容器复制 `deploy/config.production.example.yaml` 为 `/app/configs/config.yaml` |
| Compose 服务 | 默认服务、容器和镜像名使用 `console-platform`，健康检查请求 `/health`，并包含 `init: true`、停止宽限期、CPU/内存/PID 限制和 `no-new-privileges` |
| 部署脚本 | 默认运行目录 `/opt/console-platform`，默认镜像 `console-platform:local`，检查 `/health`、`/ready` 和 WebUI |
| CI | Go build 使用 `./cmd/console`，Docker build 使用 `console-platform:ci`，并通过 `bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke` 启动容器烟测 |

## 执行的静态扫描

检查部署相关文件中是否仍引用旧入口、旧品牌名、旧插件路径或旧后台探针路径：

```powershell
$deployLegacyPatterns = @(
  "cmd/" + "ao" + "i",
  "go-" + "scaffold",
  "ao" + "i-" + "admin",
  "Ao" + "i Admin",
  "/admin/server-info",
  "internal/plugin",
  "pkg/plugin",
  "pkg/pluginapi",
  "/api/v1/plugins"
)
rg -n -S @($deployLegacyPatterns | ForEach-Object { "-e"; $_ }) Dockerfile deploy.sh script/install.sh scripts/package.py deploy .github configs --glob "!**/*.sum"
```

结果：无输出。

提取容器与部署链路关键路径：

```powershell
Select-String -Path Dockerfile -Pattern "node:24|golang:1.25.7|cmd/console|console-server|web/app/build/client|build/client/index.html"
Select-String -Path deploy/docker-compose.production.example.yml,deploy.sh,.github/workflows/ci.yml,.github/workflows/deploy-remote.yml,scripts/package.py -Pattern "console-platform|console-server|cmd/console|web/app/build/client|/health|/ready|cpus|mem_limit|pids_limit|stop_grace_period"
```

关键命中包括：

- `Dockerfile`：`node:24-bookworm`、`golang:1.25.7-bookworm`、`test -f build/client/index.html`、`go build ... ./cmd/console`、`/out/console-server`、`/app/web/app/build/client`、`ENTRYPOINT ["/app/console-server"]`。
- `deploy/docker-compose.production.example.yml`：默认服务 `console-platform`，健康检查请求 `/health`。
- `deploy/docker-compose.production.example.yml`：包含 `init: true`、`stop_grace_period`、`cpus`、`mem_limit`、`pids_limit` 和 `no-new-privileges:true`，避免示例部署缺少基础资源与停止策略。
- `deploy.sh`：默认路径 `/opt/console-platform`，默认镜像 `console-platform:local`，默认容器名 `console-platform`，并检查 `/health` 与 `/ready`。
- `.github/workflows/ci.yml`：执行 `go build ... ./cmd/console`、`docker build -t console-platform:ci .` 和 `bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke`。
- `.github/workflows/deploy-remote.yml`：默认部署路径、镜像名和容器名均为 `console-platform`。
- `scripts/package.py`：默认二进制名 `console-server`，WebUI 产物目录 `web/app/build/client`，后端构建入口 `./cmd/console`。

## 仍需在 Docker 环境补跑

在具备 Docker 的 Windows 环境中，至少执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

在具备 Docker 的 Linux、macOS 或 CI 环境中，至少执行：

```bash
bash scripts/docker-smoke.sh
```

补跑时应把镜像构建结果、容器启动日志、四个 HTTP 检查结果和任何环境变量覆盖记录到发布前证据中。
