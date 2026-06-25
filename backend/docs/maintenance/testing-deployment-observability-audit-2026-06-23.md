# 测试、可观测性、部署与演示环境审计：2026-06-23

本文记录第九阶段“测试、可观测性、部署、示例数据与演示环境”的本轮审计和收口。结论以当前脚本、文档、真实进程烟测和本机工具状态为依据。

## 审计范围

- `scripts`
- `docs/testing/test-matrix.md`
- `docs/onboarding/demo-environment.md`
- `docs/release/deployment.md`
- `docs/release/preflight-checklist.md`
- `docs/testing/runtime-smoke-2026-06-22.md`
- `docs/testing/docker-static-proof-2026-06-23.md`
- `Dockerfile`
- `deploy/docker-compose.production.example.yml`

## 真实状态

| 主题 | 当前事实 |
| --- | --- |
| 本地运行烟测 | 文档已有手工步骤，但缺少可重复执行的脚本。 |
| Docker 验证 | 当前机器仍不能证明 Docker 镜像构建和容器运行；已有静态链路证明、PowerShell/Bash 双 smoke 脚本和 CI Bash 容器 smoke 配置，main CI run `28029100140` 已补齐当前提交的真实容器结果。 |
| 发布包 SQLite 边界 | 默认发布包的 SQLite 不可用提示已由 `scripts/check-package-sqlite-boundary.ps1` 固定；跨目标平台 `--cgo` SQLite 运行态仍需目标环境 smoke。 |
| 可观测性入口 | `/health`、`/ready`、`/openapi.yaml`、后台服务器状态、探针、流量探针、操作记录和错误日志已在测试矩阵中列为发布级检查项。 |
| 演示环境 | 本地演示环境不提供默认账号和长期演示 Token，初始化必须通过 `/setup`、CLI 初始化或显式 bootstrap admin。 |
| 发布证据 | 发布前检查模板覆盖迁移、备份、配置、烟测、可观测性和回滚，但本地 smoke 缺少一键命令。 |

## 发现的问题

| 类型 | 问题 | 处理 |
| --- | --- | --- |
| 可维护性问题 | 本地运行烟测依赖文档手工复制命令，容易遗漏环境变量、忘记停止进程或污染默认 `data/`。 | 新增 `scripts/runtime-smoke.ps1`，自动构建、临时启动、检查关键端点并停止进程。 |
| 文档漂移 | 旧烟测文档把 `/admin` 断言写成包含 root 节点；当前 React Router SPA 静态产物使用 `window.__reactRouterContext` 和 hydrate 占位。 | 更新测试矩阵和历史烟测说明，改为检查 React Router SPA HTML。 |
| 脚本实现缺陷 | 初版脚本按无引号 `openapi: 3` 断言，无法识别当前生成的 `"openapi": "3.0.3"`；同时假设 `/admin` 有 `id="root"`。 | 按当前真实响应修正 OpenAPI 和 SPA 校验逻辑。 |
| 部署缺证 | 本机没有 Docker 运行态证据。 | 本轮不伪造本机通过状态；当前提交的 Docker 构建和容器 smoke 已由 main CI 补证，目标环境仍需发布 smoke、镜像摘要、资源限制和回滚记录。 |

## 本轮变更

- 新增 `scripts/runtime-smoke.ps1`：
  - 构建 `./tmp/console-runtime-smoke.exe`。
  - 覆盖端口为 `127.0.0.1:19999`。
  - 使用 `tmp/ai/runtime-smoke/app.db`、`tmp/ai/runtime-smoke/uploads` 和临时日志。
  - 检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`。
  - 检查结束或失败时停止进程。
- 新增 `scripts/README.md`，说明脚本职责、运行方式、失败约定和发布包脚本。
- 新增 `scripts/docker-smoke.ps1` 与 `scripts/docker-smoke.sh`，把容器构建、启动和关键端点检查固化为 Windows 与 Linux/macOS/CI 双入口。
- 新增 `scripts/check-package-sqlite-boundary.ps1`，把发布包默认 CGO=0、`--cgo` dry-run、包内 README 和 manifest 的 SQLite/CGO 边界固化为只读检查。
- 更新测试矩阵、演示环境、部署说明和发布前模板，优先引用可执行 smoke 脚本。
- 更新本地运行烟测文档，使用当前 React Router SPA 输出描述。

## 架构影响

本轮没有改变后端运行时或前端页面，只把“项目可以本地启动并暴露关键端点”的验证方式从手工步骤提升为可重复脚本。它让后续部署、配置和静态托管路径变更可以快速获得真实进程证据，同时仍然保留 Docker 和生产环境验证的边界。

脚本使用临时目录，不写入 `configs/config.yaml`、`configs/config.local.yaml` 或 `data/`，符合本地演示环境不污染仓库事实来源的规则。

## 验证命令

```powershell
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
```

结果：通过。

输出摘要：

```text
Name    Url                                 StatusCode
----    ---                                 ----------
health  http://127.0.0.1:19999/health              200
ready   http://127.0.0.1:19999/ready               200
openapi http://127.0.0.1:19999/openapi.yaml        200
admin   http://127.0.0.1:19999/admin               200
```

补充检查：

```powershell
Get-Process | Where-Object { $_.Path -like '*console-runtime-smoke.exe' -or $_.ProcessName -like '*console-runtime-smoke*' }
```

结果：无输出，脚本没有遗留后端进程。

## 剩余风险

- Docker 镜像构建和容器运行态 smoke 仍未在本机完成；main CI run `28029100140` 已保留 `bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke` 的通过日志，目标环境发布仍需补真实地址 smoke。
- 发布包 SQLite/CGO 边界检查只证明 dry-run 和元数据，不证明跨目标平台 `--cgo` SQLite 二进制运行通过。
- 本地脚本只验证临时 SQLite 环境，不能替代 PostgreSQL/MySQL、生产密钥、外部存储、缓存和真实负载。
- 可观测性目前以 `/health`、`/ready`、结构化日志、后台状态页、探针和审计记录为主；如未来引入 Prometheus/OpenTelemetry，应补充专门的部署和告警文档。
- 当前已通过 `docs/testing/visual-qa-full-2026-06-23.md` 补齐 `smoke.spec.ts` 全量桌面/移动端截图基线；后续仍需在发布候选和目标环境按 `docs/testing/qa-report-template.md` 刷新证据。

## 后续规则

- 触及启动、配置、WebUI 静态托管或部署脚本时，优先运行 `scripts/runtime-smoke.ps1`。
- 触及 Dockerfile、Compose 或生产发布链路时，不能只用本地 smoke 代替容器验证；Windows 用 `scripts/docker-smoke.ps1`，Linux/macOS/CI 用 `scripts/docker-smoke.sh`。
- 新增脚本必须写入 `scripts/README.md`，并在相关测试或发布文档中给出调用方式。
- 所有发布证据必须区分“本地进程通过”“Docker 静态链路通过”“容器运行通过”和“生产环境通过”。
