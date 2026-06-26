---
name: aoi-admin-build-ci-governance
description: "Repository-specific workflow for build systems, CI workflows, quality gates, release-preflight orchestration, packaging scripts, Docker build checks, repository validation scripts, and generated build evidence in this aoi-admin / open console platform repository. Use when changing .github/workflows, Dockerfile, scripts/release-preflight.ps1, scripts/check-*.ps1, scripts/package.py, build documentation, test matrices, quality gates, or when investigating CI/build drift."
---

# Aoi Admin Build CI Governance

使用本 skill 处理构建、CI、质量门禁和工程脚本治理。它补充 `$aoi-admin-release-readiness`，但不替代发布证据；发布候选仍必须由 release readiness skill 收口。

## 开始前

1. 阅读 `AGENTS.md`、`docs/build/docker-and-ci.md`、`docs/testing/test-matrix.md`、`docs/release/preflight-checklist.md`、`scripts/README.md` 和待改脚本或 workflow。
2. 先确认变更属于构建/CI/质量门禁，还是发布验收、运行时生命周期、安全扫描或业务模块变更；命中其他范围时同时加载对应专项 skill。
3. 查看 `git status --branch --short` 与当前 diff，避免把运行态数据、生成目录或本地配置纳入 gate。

## 边界规则

- CI、Docker、package、preflight 和 check 脚本必须描述当前真实入口、模块化扩展边界、品牌默认值和实际使用命令。
- 质量门禁脚本应可本地重复执行；不能依赖聊天上下文、临时工作区状态或未提交文件作为唯一事实。
- 新增脚本必须有清晰参数、失败码和文档入口；默认模式应非破坏性，破坏性或耗时检查必须显式参数开启。
- 构建脚本不得隐式修改依赖锁、配置示例或生成产物；需要生成产物时必须说明来源命令和提交边界。
- CI 只做可在自动化环境证明的事；Docker、发布包、目标环境 smoke 缺失时要标为未补证，不得写成已完成。

## 修改流程

1. 识别事实来源：
   - Go 构建入口：`cmd/console`。
   - React WebUI 构建入口：`web/app` 与 `web/app/build/client`。
   - 发布包入口：`scripts/package.py`。
   - 本地 gate 入口：`scripts/release-preflight.ps1` 与 `scripts/check-*.ps1`。
   - CI 入口：`.github/workflows/ci.yml`。
2. 先改最小闭环：脚本或 workflow、对应文档、测试矩阵、发布前 checklist。
3. 若新增 gate，把它接入必要位置：
   - `scripts/release-preflight.ps1`。
   - `docs/release/preflight-checklist.md`。
   - `docs/testing/test-matrix.md`。
   - 需要 CI 拦截时同步 `.github/workflows/ci.yml`。
4. 脚本错误必须返回非零退出码；不要只写日志或 `Write-Warning` 后继续通过。
5. 更新 docs 时写明命令、适用场景、不可本地验证的外部依赖和补证方式。

## 常用验证

按变更范围选择：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
python scripts/package.py --dry-run --target linux/amd64 --version smoke --skip-web-build
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
go test ./... -count=1 -mod=readonly
pnpm --dir web/app typecheck
git diff --check
```

CI、Docker、发布包或跨平台脚本变更时，优先在 CI 或目标平台补：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId <workflow-run-id> -CommitSha <commit-sha>
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -LogPath <docker-smoke-ci.log>
```

## 收尾要求

- 最终说明构建/CI 事实来源、改动文件、接入的 gate、已运行命令和未补证项。
- 如果脚本或 workflow 因本机缺工具无法完整执行，说明缺失工具、影响范围和可在 CI/目标环境运行的命令。
- 任务修改文件后，使用 `$git-conventional-commit` 自动提交。
