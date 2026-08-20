# 新开发者路径演练：2026-06-23

本报告记录从当前工作区按 README 和工程文档入口执行的最小新开发者路径验证。目标是证明开发者拿到仓库后，能识别工具链、打开 CLI、执行后端最小测试、生成 API 契约、校验前端 i18n 和类型。

## 基本信息

| 项目 | 结果 |
| --- | --- |
| 日期 | 2026-06-23 |
| 操作系统 | Windows / PowerShell |
| Go | `go version go1.25.7 windows/amd64` |
| Node.js | `v24.11.1` |
| pnpm | `10.22.0` |
| Docker | 不可用，`docker` 命令不存在 |
| Bash | 不可用，`bash` 命令不存在 |
| 临时输出 | `tmp/ai/onboarding-smoke-20260623/openapi.yaml` |

`tmp/ai` 是本地临时证据目录，不进入版本控制。

## 执行命令

```powershell
go version
node --version
pnpm --version
docker --version
bash --version
go run ./cmd/console --help
go test ./internal/config ./internal/transport/http ./types/... -count=1 -mod=readonly
New-Item -ItemType Directory -Force -Path tmp\ai\onboarding-smoke-20260623 | Out-Null
go run ./cmd/console api openapi --output tmp/ai/onboarding-smoke-20260623/openapi.yaml
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
```

## 验证结果

| 检查项 | 结果 | 说明 |
| --- | --- | --- |
| 工具链 | 通过 | Go、Node.js 和 pnpm 版本满足当前项目要求 |
| Docker/Bash | 未通过 | 当前机器未安装 Docker CLI 和 Bash，容器构建和容器烟测仍需目标环境或 CI 补证 |
| CLI 入口 | 通过 | `go run ./cmd/console --help` 可列出 `api`、`db`、`iam`、`init`、`run`、`server`、`service` 命令 |
| 后端最小测试 | 通过 | `internal/config`、`internal/transport/http` 和 `types/...` 测试通过 |
| OpenAPI 临时生成 | 通过 | 临时输出包含 `/api/v1/announcements` 和 `/openapi.yaml` |
| 前端 i18n | 通过 | `i18n resources are aligned.` |
| 前端类型检查 | 通过 | `theme:check`、`content:generate`、`react-router typegen` 和 `tsc -b` 通过 |

## 结论

当前 README 的最小开发者路径可在本机完成 Go/React 基础验证。Docker/Bash 容器路径仍依赖外部环境，不应在当前机器上标记为通过。

后续如果要做发布级验收，应在具备 Docker 的环境补跑：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

Linux/macOS/CI 环境可运行：

```bash
bash scripts/docker-smoke.sh
```

脚本会构建镜像、启动临时容器并检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`；完整发布级页面覆盖仍按 [测试矩阵](test-matrix.md) 继续补 `/`、`/setup` 和 `/admin` 的浏览器验证。
