# 发布前 gate 脚本审计：2026-06-23

本文记录 `scripts/release-preflight.ps1` 的新增依据、执行边界和验证结果。它用于把发布前本地检查从人工拼接命令收敛为可重复入口，但不替代生产迁移、备份、密钥注入、目标环境烟测和人工发布审批。

## 当前事实

- 仓库已有 CI、开源 readiness、Agent skill 结构检查、运行态烟测、Docker 容器烟测和发布前检查模板。
- 发布前检查模板仍需要人工逐条复制命令，容易在阶段收口时漏跑局部 gate。
- 视觉 QA 已有 Playwright 配置和历史截图报告，但缺少根目录一键复跑入口。
- 发布包 SQLite/CGO 状态已经由 `scripts/package.py` 输出和写入包元数据，但此前未纳入默认发布前 gate。
- 当前机器没有 Docker CLI，因此默认发布前 gate 不能把 Docker 镜像构建写成必过项。
- 当前机器没有 Bash，因此 Linux/macOS/CI Docker smoke 入口只能在本机做静态检查；真实执行交给 GitHub Actions 或目标环境。
- 生产迁移、备份、回滚和密钥注入必须基于目标环境证据，不能由本地脚本伪造。

## 新增脚本

`scripts/release-preflight.ps1` 是非破坏性发布前本地 gate 编排脚本：

| 模式 | 覆盖范围 |
| --- | --- |
| 默认模式 | `check-local-tooling.ps1`、`check-entry-brand-convergence.ps1`、`check-plugin-removal.ps1`、`check-error-result-boundaries.ps1`、`check-agent-skills.ps1`、`check-doc-readmes.ps1`、`check-doc-links.ps1`、`check-open-source-readiness.ps1`、`check-worktree-convergence.ps1`、发布证据模板结构校验、后台补偿观测模板校验、发布证据校验器自检、CI Docker 证据校验器自检、发布包 SQLite/CGO 边界检查、聚焦 Go 测试、前端 i18n、视觉 QA 脚本语法、Docker PowerShell/Bash 烟测入口静态检查、`git diff --check` |
| `-Full` | 将 Go 测试扩展到 `go test ./...`，并补充 `go vet`、服务构建、前端 typecheck 和前端 build |
| `-IncludePackage` | 执行 `python scripts/package.py --dry-run --target linux/amd64 --version preflight` |
| `-IncludeRuntimeSmoke` | 执行本地真实进程烟测 `scripts/runtime-smoke.ps1` |
| `-IncludeVisualQA` | 执行代表性视觉 QA `scripts/visual-qa.ps1`，生成桌面/移动端截图 |
| `-IncludeDocker` | 执行 Docker 容器烟测 `scripts/docker-smoke.ps1`，仅应在具备 Docker CLI 的环境启用 |
| `-SkipFrontend` | 跳过前端 i18n/typecheck/build，用于只验证后端或本地缺少前端工具链的场景 |

脚本会收集每一步结果，最后输出表格；任一步失败时返回非零退出码。

## 设计边界

- 默认模式不启动服务、不构建 Docker 镜像、不写入生产配置、不修改 `data/`；默认只检查视觉 QA 脚本语法。
- `-IncludeVisualQA` 会启动 Playwright dev server 并写入 `tmp/qa/visual-qa` 截图，应在可见 UI 变更或发布候选时显式启用。
- Docker 真实证据由 `scripts/docker-smoke.ps1` 或 `scripts/docker-smoke.sh` 在 Docker 环境补齐；当前 main 提交已通过 GitHub Actions Bash 容器 smoke 和 `scripts/check-ci-docker-evidence.ps1` 校验，目标环境发布仍需记录目标镜像、资源限制和真实地址 smoke。
- 生产迁移状态、迁移执行、备份、回滚和密钥注入仍必须写入发布证据模板。
- 脚本只证明本地候选工作树满足一组发布前 gate，不能代替 CI 或生产发布批准。

## 验证结果

本轮已执行：

```powershell
$null = [scriptblock]::Create((Get-Content -LiteralPath 'scripts/release-preflight.ps1' -Raw)); 'release preflight syntax ok'
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -IncludeVisualQA
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
git diff --check
```

结果：

- `release-preflight.ps1` 语法检查通过。
- 默认 gate 通过：本机工具检查、入口与品牌收敛、插件移除、错误与结果边界、Agent skill 检查、README 覆盖检查、文档链接检查、开源 readiness、工作树收敛审计、发布证据模板结构校验、后台补偿观测模板校验、发布证据校验器自检、CI Docker 证据校验器自检、发布包 SQLite/CGO 边界检查、聚焦 Go 测试、前端 i18n、视觉 QA 脚本语法、Docker PowerShell/Bash 烟测入口静态检查和空白检查均通过。
- `-IncludeVisualQA` gate 通过：在默认 gate 基础上实际执行 `scripts/visual-qa.ps1`，12 条桌面/移动端代表性用例通过并生成 12 张截图。
- `check-local-tooling.ps1` 通过，已把 Go、Node、pnpm/corepack、Python、GitHub CLI、Docker 和 Bash 的可用性纳入默认 gate；当前本机 Docker 和 Bash 为 optional 缺失，不能声明容器 smoke 已完成。
- `check-entry-brand-convergence.ps1` 通过，已把入口、Docker、CI、发布包和部署脚本的中性命名纳入默认 gate。
- `check-plugin-removal.ps1` 通过，已把插件运行时、插件配置示例、插件 API 和前端插件入口的删除边界纳入默认 gate。
- `check-error-result-boundaries.ps1` 通过，已把生产 Go 代码中显式忽略错误、关闭、删除、写入、同步、发送或停止结果的高风险候选纳入默认 gate；当前仅允许已解释的 best-effort 例外。
- `check-agent-skills.ps1` 通过，已把 `.agents/skills` 的 front matter、仓库级 `agents/openai.yaml` 和默认触发提示纳入默认 gate。
- `check-doc-readmes.ps1` 通过，已把 81 个关键目录的 README 覆盖纳入默认 gate。
- `check-doc-links.ps1` 通过，已把根 README、AGENTS、仓库级 skill、`docs/**`、关键源码 README 和 React 前端文档的相对文件、目录、图片路径和 Markdown 锚点纳入默认 gate。
- `check-operational-observation-template.ps1` 通过，已把 IAM 授权策略重载、IAM 通知投递队列、System 维护清理和流量探针的目标环境观测模板结构纳入默认 gate。
- `check-package-sqlite-boundary.ps1` 通过，已把默认 `CGO_ENABLED=0`、`--cgo` dry-run、包内 README 和 manifest 的 SQLite/CGO 边界纳入默认 gate；该检查不替代目标平台 SQLite 运行 smoke。
- `check-open-source-readiness.ps1` 更新后通过，已把 `scripts/release-preflight.ps1`、`scripts/check-local-tooling.ps1`、`scripts/check-entry-brand-convergence.ps1`、`scripts/check-plugin-removal.ps1`、`scripts/check-error-result-boundaries.ps1`、`scripts/check-agent-skills.ps1`、`scripts/check-doc-readmes.ps1`、`scripts/check-doc-links.ps1`、`scripts/check-operational-observation-template.ps1`、`scripts/check-package-sqlite-boundary.ps1`、`scripts/check-worktree-convergence.ps1` 和本文纳入关键路径。
- `check-worktree-convergence.ps1` 通过，当前未收敛工作树没有混入 `.env`、本地配置、根级运行态目录或生成目录，这些本地或生成路径也没有被 Git 跟踪；默认模式不要求工作树干净。
- `git diff --check` 无输出，未发现空白错误。

## 后续补证

发布候选前建议在本机或 CI 执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke -IncludeVisualQA
```

具备 Docker CLI 的目标环境继续执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke -IncludeVisualQA -IncludeDocker
```

如果目标环境不能运行 PowerShell，应使用 `bash scripts/docker-smoke.sh` 或按 `scripts/release-preflight.ps1`、`scripts/docker-smoke.ps1`、`scripts/docker-smoke.sh` 中的同等步骤手工执行，并把每一步结果写入发布前证据。
