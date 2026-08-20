# Docker 容器烟测脚本审计：2026-06-23

本文记录本轮对 Docker 未补证缺口的推进。当前机器仍缺少 Docker CLI，且缺少 Bash，因此不能声明本机镜像构建或容器运行已通过；本轮完成的是把目标环境需要执行的 Docker 构建、容器启动和关键端点检查固化为 Windows PowerShell 与 Linux/macOS/CI Bash 双入口，并接入 GitHub Actions。

## 当前阶段

发布与部署补证：Docker 容器烟测入口。

## 分析结果

前置事实：

- `Dockerfile` 使用 `./cmd/console` 构建 `/app/console-server`。
- 容器默认命令为 `/app/console-server server --config=/app/configs/config.yaml`。
- 生产示例配置默认监听 `0.0.0.0:${APP_SERVER_PORT:9999}`。
- 容器镜像包含 `web/app/build/client`，Go 服务负责托管 React WebUI。
- 当前机器执行 `docker --version` 失败，无法补真实镜像构建证据。
- 当前机器执行 `bash --version` 失败，无法本机执行 Bash smoke；GitHub Actions 的 `ubuntu-latest` runner 可执行 Bash 和 Docker。

因此，本轮不能关闭本机 Docker 验收缺口，但可以把目标环境补证命令从手工步骤收敛为脚本，并让 CI 在镜像构建后执行容器烟测。

## 变更内容

新增 `scripts/docker-smoke.ps1`：

- 默认构建镜像 `console-platform:local`。
- 启动临时容器 `console-platform-smoke`。
- 映射宿主机 `19998` 到容器 `9999`。
- 使用容器内 SQLite、临时上传目录和容器日志路径。
- 检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`。
- 检查失败时输出容器日志尾部，检查结束后默认清理临时容器。
- 支持 `-SkipBuild` 复用已有镜像，支持 `-KeepContainer` 保留容器排查。

新增 `scripts/docker-smoke.sh`：

- 默认构建镜像 `console-platform:local`。
- 支持 `--skip-build` 复用 CI 已构建镜像。
- 支持 `--image`、`--container`、`--host-port`、`--container-port`、`--timeout` 和 `--keep-container`。
- 启动临时容器后检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`。
- 失败时输出容器日志尾部，并通过 `trap` 默认清理临时容器。

更新 `.github/workflows/ci.yml`：

- `docker build -t console-platform:ci .` 后新增 `bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke`。
- CI 不再只证明镜像能 build，还会证明容器能启动并服务关键运行态入口。

同步更新：

- `scripts/README.md`
- `docs/testing/test-matrix.md`
- `docs/build/docker-and-ci.md`
- `docs/release/deployment.md`
- `docs/release/preflight-checklist.md`
- `docs/release/release-evidence-template.md`
- `docs/testing/docker-static-proof-2026-06-23.md`
- `docs/release/preflight-2026-06-23.md`
- `docs/maintenance/open-source-readiness.md`
- `docs/maintenance/final-acceptance-gap-audit-2026-06-23.md`

## 验证结果

脚本语法通过：

```powershell
$null = [scriptblock]::Create((Get-Content -LiteralPath 'scripts/docker-smoke.ps1' -Raw)); 'docker smoke syntax ok'
```

结果：

```text
docker smoke syntax ok
```

`scripts/release-preflight.ps1` 默认 gate 会同时检查 PowerShell Docker smoke 脚本语法、Bash Docker smoke 脚本 shebang、LF 换行和四个关键端点片段。

当前机器执行脚本：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

结果：

```text
Docker CLI is not available. Install Docker or run this script on a Docker-enabled host.
```

该结果证明脚本入口可解析，但当前机器仍无法完成 Docker 镜像和容器运行验证。Bash 脚本未在本机执行，因为当前机器缺少 Bash 和 Docker；CI workflow 已配置在 Ubuntu runner 上执行该脚本，main CI run `28029100140` 已通过 Bash 容器 smoke 和 artifact 校验。

## 剩余问题

| 缺口 | 当前状态 | 后续证据 |
| --- | --- | --- |
| Docker 镜像构建 | 本机未验证；main CI run `28029100140` 已通过 build + smoke gate | 发布目标环境重新构建镜像时，运行 `powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1` 或 `bash scripts/docker-smoke.sh` 并保留构建日志 |
| 容器运行态烟测 | 本机未验证；main CI run `28029100140` 已通过 Bash 容器烟测并校验 artifact | 发布目标环境记录脚本输出中的 `/health`、`/ready`、`/openapi.yaml`、`/admin` 结果，或引用已校验的 CI artifact 作为当前提交证据 |
| 生产数据库与密钥 | 未验证 | 使用真实 PostgreSQL/MySQL、密钥注入和发布前模板补证 |

## 下一步

在具备 Docker 的目标环境运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

如果镜像已由 CI 或本地提前构建，可运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1 -SkipBuild -ImageName console-platform:local
```

Linux、macOS 或 CI 环境运行：

```bash
bash scripts/docker-smoke.sh
bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke
```
