# 发布证据校验脚本审计：2026-06-23

本文记录 `scripts/check-release-evidence.ps1` 与 `docs/release/release-evidence-template.md` 的新增依据、边界和验证结果。它们用于防止发布证据只停留在文档模板，尤其避免迁移、备份、密钥、烟测和回滚记录留空后被误判为可发布。

## 当前事实

- `docs/release/preflight-checklist.md` 已包含发布证据结构，但模板嵌在长文档中，不便直接复制和机器校验。
- 当前工作区已有 `scripts/release-preflight.ps1` 编排本地 gate，并新增 `scripts/check-entry-brand-convergence.ps1`、`scripts/check-plugin-removal.ps1`、`scripts/check-agent-skills.ps1`、`scripts/check-doc-readmes.ps1`、`scripts/check-doc-links.ps1`、`scripts/check-operational-observation-template.ps1` 与 `scripts/check-worktree-convergence.ps1` 记录入口命名、插件移除、Agent skill 元数据、README 覆盖、文档链接、后台补偿观测模板和工作树收敛状态；生产迁移、备份、密钥注入、回滚和发布后观察仍必须由目标环境证据证明。
- 当前机器缺少 Docker CLI 和 Bash，不能把本机容器构建与容器烟测写成已通过；模板同时保留 PowerShell 与 Bash smoke 命令，便于 Windows 和 Linux/CI 目标环境留证。
- 正式发布证据不应包含明文密钥、连接串、Token、Cookie 或私有环境敏感值。

## 新增内容

新增 `docs/release/release-evidence-template.md`：

- 独立提供发布证据结构，便于复制到发布 PR、发布单或运维记录。
- 覆盖基本信息、变更范围、迁移证据、备份证据、配置与密钥、验证命令、烟测、可观测性、回滚计划和发布后观察。
- 显式包含 `APP_AUTH_SIGNING_KEY`、`APP_AUTH_REFRESH_TOKEN_PEPPER`、`APP_AUTH_MFA_SECRET_KEY` 三个必查密钥名，但要求只记录脱敏状态。
- 验证命令中包含 `scripts/check-entry-brand-convergence.ps1`、`scripts/check-plugin-removal.ps1`、`scripts/check-agent-skills.ps1`、`scripts/check-doc-readmes.ps1`、`scripts/check-doc-links.ps1`、`scripts/check-operational-observation-template.ps1`、`scripts/check-worktree-convergence.ps1`、`scripts/check-ci-docker-evidence.ps1`、`scripts/docker-smoke.ps1` 和 `scripts/docker-smoke.sh`；校验脚本强制检查入口命名、插件移除、Agent skill 元数据、README 覆盖、文档链接、后台补偿观测模板、工作树收敛、CI Docker artifact 证据、PowerShell Docker smoke 和 Bash Docker smoke 路径，确保 Windows 与 Linux/macOS/CI 两类容器烟测入口都进入发布证据。

新增 `scripts/check-release-evidence.ps1`：

| 模式 | 用途 |
| --- | --- |
| `-TemplateMode` | 校验模板结构、关键字段、命令、烟测路径和密钥名是否完整 |
| 默认模式 | 校验填写后的发布证据，并拒绝明显空占位、`TBD`、`TODO`、`未执行`、空结果表格和疑似明文密钥 |
| `-SelfTest` | 校验脚本自身会拒绝 `未执行`、`未验证`、`skipped`、`not run` 等未补证占位 |

## 设计边界

- 脚本只检查证据文件结构和明显风险，不连接生产数据库、不执行迁移、不访问目标环境。
- 真实发布仍需要目标环境执行 `db migrate status/up`、备份、恢复演练、Docker smoke、日志检索和回滚验证。
- 如果目标环境确实无法完成某项发布前要求，应阻塞发布或在人工审批中明确风险，不应绕过脚本写成通过。

## 验证结果

本轮已执行：

```powershell
$null = [scriptblock]::Create((Get-Content -LiteralPath 'scripts/check-release-evidence.ps1' -Raw)); 'release evidence syntax ok'
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

结果：

- `check-release-evidence.ps1` 语法检查通过。
- `release-evidence-template.md` 模板结构校验通过。
- `check-release-evidence.ps1 -SelfTest` 通过，确认正式发布证据会拒绝 `未执行`、`未验证`、`skipped`、`not run` 等未补证占位。
- `check-ci-docker-evidence.ps1 -SelfTest` 通过，确认 CI Docker 证据校验器会拒绝不完整 smoke log 和失败 workflow metadata。
- `release-preflight.ps1` 默认 gate 通过，并已纳入模板结构校验。
- `check-entry-brand-convergence.ps1` 通过，发布证据模板已包含入口与品牌收敛命令。
- `check-plugin-removal.ps1` 通过，发布证据模板已包含插件系统移除命令。
- `check-agent-skills.ps1` 通过，发布证据模板已包含 Agent skill 元数据检查命令。
- `check-doc-readmes.ps1` 通过，发布证据模板已包含 README 覆盖检查命令。
- `check-doc-links.ps1` 通过，发布证据模板已包含文档相对链接检查命令。
- `check-operational-observation-template.ps1` 通过，发布证据模板已包含后台补偿观测模板检查命令。
- `check-worktree-convergence.ps1` 通过，发布证据模板已包含工作树收敛命令。
- `check-open-source-readiness.ps1` 更新后通过，已把发布证据模板、发布证据校验脚本和本文纳入关键路径。
- `git diff --check` 无输出，未发现空白错误。

## 后续补证

正式发布时应复制 `docs/release/release-evidence-template.md`，填写目标环境真实结果后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -Path <发布证据文件>
```

该检查通过后，仍必须保留目标环境命令输出、备份位置、回滚命令、烟测结果和观察窗口记录。
