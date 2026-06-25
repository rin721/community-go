# 部署防线检查审计：2026-06-23

本文记录本轮对发布/部署证据的继续收口。当前机器仍不能运行 Docker，因此本轮不声明容器构建或容器运行通过；本轮完成的是把可静态证明的部署防线和 CI 仓库治理 gate 纳入脚本和文档，避免 Compose、CI 或发布证据模板在后续改动中丢失关键约束。

## 当前阶段

第九阶段：测试、可观测性、部署和发布证据。

## 分析结果

现有 Docker smoke 已覆盖镜像构建、容器启动和关键端点检查，但 `deploy/docker-compose.production.example.yml` 还缺少明确的 CPU、内存、PID 限制和停止宽限期。发布证据模板已有迁移、备份、密钥、烟测和回滚结构，但未强制记录镜像摘要、容器资源限制、优雅停止验证和部署标签。

后续复查发现 CI workflow 已配置 Go、React WebUI、Docker build 和容器 smoke，但仓库治理 gate 仍只在本地 release preflight 和 readiness 脚本中执行。这样会导致 README 覆盖、文档链接、Agent skill 元数据、入口与品牌收敛、插件移除和部署防线检查只依赖人工本地执行，不能在 PR/CI 层及时阻断漂移。

再次复查发现 CI 只在 `main` / `master` push 和 PR 上触发。当前仓库的 Agent 分支约定使用 `codex/**`，如果这些分支不能直接触发 CI，就无法在不推送 `main` 或不开 PR 的情况下取得当前提交的 Docker smoke artifact。

这些缺口不会影响本地开发启动，但会影响项目作为开源平台在类生产环境中的可复用性：新开发者可以 build，却不一定知道发布时必须保留哪些运行边界。

## 变更内容

- `deploy/docker-compose.production.example.yml` 增加 `init: true`、`stop_grace_period`、`cpus`、`mem_limit` 和 `pids_limit`，默认值可通过 `APP_CONTAINER_*` 环境变量覆盖。
- 新增 `scripts/check-deployment-guardrails.ps1`，检查 Dockerfile、Compose、CI 和发布证据模板是否保留关键部署防线。
- `.github/workflows/ci.yml` 增加仓库治理 gate，依次运行 Agent skill、README 覆盖、文档链接、入口与品牌收敛、插件移除、部署防线和开源 readiness 检查。
- `.github/workflows/ci.yml` 增加 `codex/**` 分支 push 触发项，便于 Codex 工作分支直接获取 Docker build、容器 smoke 和 artifact 证据。
- `scripts/check-deployment-guardrails.ps1` 增加 CI 仓库治理 gate 和 `codex/**` 触发项断言，防止 CI 后续只保留 Docker smoke 或失去工作分支证据入口。
- `scripts/check-deployment-guardrails.ps1` 增加 Docker smoke 通知驱动断言，确保 `scripts/docker-smoke.ps1` 与 `scripts/docker-smoke.sh` 在 smoke 环境显式使用 `APP_AUTH_NOTIFICATION_DRIVER=debug`，不依赖外部 SMTP。
- `scripts/release-preflight.ps1` 默认 gate 增加部署防线检查。
- `scripts/check-open-source-readiness.ps1` 将部署防线脚本纳入必备路径。
- 发布证据模板、发布前 checklist、Docker/CI 文档、脚本说明和测试矩阵同步镜像摘要、部署标签、容器资源限制、优雅停止验证和 CI 仓库治理 gate。

## 架构影响

该变更不改变应用运行时代码，也不引入新的部署平台假设。它把生产风格示例的基础防线从“文档建议”提升为可执行检查，并把本地仓库治理 gate 前移到 CI。目标环境仍需按实际实例覆盖资源限制、数据库、密钥和回滚策略。

## 验证结果

本轮已运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-deployment-guardrails.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

结果：

- 部署防线检查通过。
- Agent skill 检查通过。
- README 覆盖检查通过。
- 文档链接检查通过。
- 发布证据模板结构校验通过。
- 默认发布前 gate 通过，并已包含部署防线检查。
- 开源 readiness 检查通过。
- `git diff --check` 无空白错误。

当前 main 提交的 Docker 真实构建和容器运行已由 CI run `28029100140` 补证；生产目标环境仍需记录镜像摘要、资源限制、真实地址 smoke 和回滚准备。

## 剩余问题

- 本机缺少 Docker CLI，仍不能关闭 Docker 镜像构建和容器 smoke 真实证据缺口。
- 生产数据库迁移、备份恢复和目标环境观测窗口仍必须由发布证据文件记录，脚本只检查结构和明显风险。
