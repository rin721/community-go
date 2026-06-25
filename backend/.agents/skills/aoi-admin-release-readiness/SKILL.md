---
name: aoi-admin-release-readiness
description: "Repository-specific workflow for release readiness, deployment evidence, package/Docker validation, and final acceptance in this aoi-admin / open console platform repository. Use when preparing releases, CI/CD changes, Docker or Compose changes, scripts/package.py updates, runtime smoke, visual QA, release evidence, migration/backup/rollback checks, or documenting remaining external blockers."
---

# Aoi Admin Release Readiness

使用本 skill 做发布前 gate、部署证据、Docker/发布包验证和最终验收收口。它不能把本地静态检查包装成生产发布完成；目标环境证据缺失时必须明确标记。

## 开始前

1. 阅读 `AGENTS.md`、`docs/release/preflight-checklist.md`、`docs/release/deployment.md`、`docs/build/docker-and-ci.md` 和 `docs/backlog/known-gaps.md`。
2. 查当前分支、工作树、最近提交和变更范围。
3. 区分本地可验证项、CI 可验证项、目标环境才可验证项。

## 发布 gate

默认先跑非破坏性检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
```

按风险追加：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke -IncludeVisualQA
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke -IncludeVisualQA -IncludeDocker
```

当前机器缺少 Docker 或 Bash 时，不要宣称容器 smoke 完成；保留静态链路证明，并要求 CI 或目标环境补 `scripts/docker-smoke.ps1` / `scripts/docker-smoke.sh` 结果。

## 发布包与 SQLite/CGO

- `scripts/package.py` 默认 `CGO_ENABLED=0`，适合交叉编译，但 SQLite 运行态不可用。
- `package.py --dry-run`、包内 `README.txt` 和 `manifest.json` 必须显示 SQLite 运行态状态。
- 发布包 SQLite/CGO 边界变更后必须运行 `powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1`，确认默认 CGO=0 与 `--cgo` 两种 dry-run、包内 README 和 manifest 字段没有漂移。
- 发布包部署优先使用 PostgreSQL/MySQL。
- 确需 SQLite 时，使用 `python scripts/package.py --cgo ...` 在目标平台或具备 C 工具链的环境构建，并补目标环境 smoke。

## 证据要求

正式发布记录从 `docs/release/release-evidence-template.md` 复制，填写后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -Path <发布证据文件>
```

证据至少覆盖：

- 当前提交、镜像标签、镜像摘要或发布包路径。
- 数据库迁移状态、备份位置、恢复方案。
- 密钥注入方式和脱敏记录。
- `/health`、`/ready`、`/openapi.yaml`、`/`、`/setup`、`/admin` smoke。
- 资源限制、优雅停止、观察窗口和回滚命令。

## 文档同步

- 变更 Dockerfile、Compose、CI、部署脚本或发布包脚本时，更新 `docs/build/docker-and-ci.md`、`docs/release/deployment.md`、`scripts/README.md` 和相关审计文档。
- 新发现的不可本地验证项写入 `docs/backlog/known-gaps.md`，不要写成已完成。
- 发布候选阶段更新 `docs/release/preflight-2026-06-23.md` 或新的日期化记录。

## 常用验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-deployment-guardrails.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
python scripts/package.py --dry-run --target linux/amd64 --version smoke --skip-web-build
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
git diff --check
```
