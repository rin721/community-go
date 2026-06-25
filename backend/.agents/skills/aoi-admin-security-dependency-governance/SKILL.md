---
name: aoi-admin-security-dependency-governance
description: "Repository-specific workflow for security-sensitive changes, dependency updates, vulnerability scanning, secret handling, auth-adjacent hardening, HTTP security headers, CORS/CSRF/cookie policies, supply-chain checks, and security documentation in this aoi-admin / open console platform repository. Use when changing go.mod, go.sum, web/app package dependencies, Docker base images, security-related config, scanner scripts, secret examples, or security review docs."
---

# Aoi Admin Security Dependency Governance

使用本 skill 处理安全敏感变更、依赖升级、漏洞扫描、密钥治理和供应链检查。它补充 `$aoi-admin-iam-governance` 与 `$aoi-admin-config-governance`；认证授权业务语义仍由 IAM skill 收口，配置结构仍由配置治理 skill 收口。

## 开始前

1. 阅读 `AGENTS.md`、`docs/release/preflight-checklist.md`、`docs/testing/test-matrix.md`、`tools/ai/security-checks.md`、相关配置示例和待改依赖文件。
2. 判断变更类型：依赖升级、镜像基线、安全配置、密钥示例、扫描脚本、认证授权、HTTP 安全头或前端敏感数据处理。
3. 查看 `git status --branch --short` 与 diff，确认没有 `.env`、本地配置、明文密钥、token、数据库文件、测试报告或运行态输出进入版本控制。

## 边界规则

- 任何密钥、token、口令、私钥、证书、真实 Cookie、真实连接串或生产主机信息不得写入代码、文档、配置示例、截图或测试 fixture。
- 配置示例只能使用占位值，并说明部署时如何注入；不得把本地默认值包装成生产安全配置。
- 依赖变更必须说明为什么现有标准库、已有依赖或项目封装不能满足需求；不得引入重复框架或宽泛依赖。
- 安全扫描失败不得被脚本吞掉；如果工具缺失，应明确记录缺失工具和本地不可验证范围。
- 安全日志不得替代错误返回；安全相关错误必须沿调用链返回给上层统一处理。
- 前端不得把敏感字段写入 URL、localStorage、sessionStorage、截图、日志或 analytics payload。

## 修改流程

1. 先定位事实来源：
   - Go 依赖：`go.mod`、`go.sum`。
   - React 依赖：`web/app/package.json` 与 `web/app/pnpm-lock.yaml`。
   - 安全配置：`internal/config`、`configs/*.example.yaml`、`deploy/config.production.example.yaml`、`.env.example`。
   - HTTP 安全链路：`internal/middleware`、`internal/transport/http`、route contract 与前端 API client。
   - 扫描入口：`tools/ai/security-checks.md`、`scripts/release-preflight.ps1`、CI workflow。
2. 小步修改依赖或配置，并同步 README、测试矩阵、发布前 checklist 和安全检查说明。
3. 修改认证、授权、Cookie、CSRF、CORS、会话、API Token、MFA 或邀请链路时，同时使用 `$aoi-admin-iam-governance`。
4. 修改环境变量、配置默认值、生产配置或系统配置快照时，同时使用 `$aoi-admin-config-governance`。
5. 修改 CI、scanner 或 preflight gate 时，同时使用 `$aoi-admin-build-ci-governance`。

## 常用验证

按风险运行：

```powershell
go test ./... -count=1 -mod=readonly
go vet ./...
govulncheck ./...
gosec ./...
osv-scanner scan source .
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app exec pnpm audit --audit-level moderate
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
git diff --check
```

如果本机缺少 `govulncheck`、`gosec`、`osv-scanner`、Docker 或 pnpm，最终说明工具缺失、未覆盖风险和开发者/CI 可运行命令，不要把未运行项写成通过。

## 文档同步

- 依赖或扫描工具变化：更新 `docs/testing/test-matrix.md`、`docs/release/preflight-checklist.md`、`tools/ai/security-checks.md` 和相关 skill。
- 安全配置变化：更新配置示例、环境变量说明、生产部署文档和配置治理文档。
- 发现已知安全缺口但本次不处理：写入 `docs/backlog/known-gaps.md`，并标注影响范围与建议验证命令。

## 收尾要求

- 最终说明安全影响、依赖变化、密钥/配置边界、验证命令和未补证项。
- 提交前重新搜索敏感关键词和本次新增配置名，确认没有明文 secret 或旧示例残留。
- 任务修改文件后，使用 `$git-conventional-commit` 自动提交。
