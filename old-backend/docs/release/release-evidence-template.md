# 发布证据

<!-- release-evidence:v1 -->

本模板用于正式发布、类生产发布或发布候选验收。密钥值、连接串、Token、Cookie 和私有地址必须脱敏。填写完成后可运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -Path <发布证据文件>
```

模板结构校验可运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
```

## 基本信息

<!-- release-section:basic-info -->

- 环境：
- 发布负责人：
- 发布时间：
- 分支：
- 提交 SHA：
- 标签：
- CI Workflow Run：
- Docker Smoke Artifact：
- 部署标签：<!-- release-field:deployment-tag -->
- 产物：
- Docker 镜像：
- Docker 镜像摘要：<!-- release-field:docker-image-digest -->
- 容器资源限制：<!-- release-field:container-resource-limits -->

## 变更范围

<!-- release-section:change-scope -->

- 后端：
- 前端：
- 配置：
- 数据库迁移：
- 文档：
- 影响模块：

## 迁移证据

<!-- release-section:migration-evidence -->

- 迁移目录：`internal/migrations`
- 发布前状态命令：`go run ./cmd/console db migrate status --config=<生产配置路径>`
- 发布前状态结果：
- 本次新增迁移：
- 风险分类：新增型 / 变更型 / 破坏型
- 执行命令：`go run ./cmd/console db migrate up --config=<生产配置路径>`
- 执行结果：
- 回滚方式：
- 是否需要数据恢复：

## 备份证据

<!-- release-section:backup-evidence -->

- 备份范围：
- 备份时间：
- 备份位置：
- 校验方式：
- 恢复演练结果：

## 配置与密钥

<!-- release-section:config-secrets -->

- 新增或修改配置项：
- 已同步示例配置：是 / 否
- 已设置生产环境变量：是 / 否
- 密钥是否脱敏记录：是 / 否
- 需要轮换的密钥：
- 必查密钥名：`APP_AUTH_SIGNING_KEY`、`APP_AUTH_REFRESH_TOKEN_PEPPER`、`APP_AUTH_MFA_SECRET_KEY`

## 验证命令

<!-- release-section:verification-commands -->

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1` |  |  |
| `go test ./internal/config ./internal/transport/http -count=1 -mod=readonly` |  |  |
| `go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console` |  |  |
| `pnpm --dir web/app typecheck` |  |  |
| `pnpm --dir web/app lint:i18n` |  |  |
| `pnpm --dir web/app build` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-deployment-guardrails.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId <workflow-run-id> -CommitSha <commit-sha>` |  | 使用 CI artifact 补 Docker 证据时填写 |
| `powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1` |  |  |
| `powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1` |  |  |
| `bash scripts/docker-smoke.sh` |  | Linux/macOS/CI 环境使用 |
| `git diff --check` |  |  |

## 烟测

<!-- release-section:smoke-tests -->

| 路径 | 结果 | 备注 |
| --- | --- | --- |
| `/health` |  |  |
| `/ready` |  |  |
| `/openapi.yaml` |  |  |
| `/` |  |  |
| `/setup` |  |  |
| `/admin` |  |  |

## 可观测性

<!-- release-section:observability -->

- 日志检索方式：
- 最近错误日志：
- trace id 示例：
- `/ready` 状态：
- 关键探针结果：
- 审计记录：
- 优雅停止验证：<!-- release-field:graceful-shutdown -->
- 观察窗口：

## 后台补偿观测

<!-- release-section:compensation-observation -->

详细记录可复制 [后台补偿观测记录模板](operational-observation-template.md)。如果本次发布未触及 IAM、System、通知、媒体或探针，也需要记录是否复核现有后台补偿路径。

| 补偿路径 | 期望证据 | 结果 | 备注 |
| --- | --- | --- | --- |
| IAM policy reload scheduler | 目标环境日志包含 `iam policy reload retry completed` 或 `iam policy reload retry failed`；角色/成员权限变更失败不被吞掉 |  |  |
| IAM notification outbox scheduler | `/admin/notification-outbox` 脱敏可读；日志包含 `iam notification outbox dispatch completed` 或失败状态；手动 retry 写入审计 |  |  |
| System maintenance cleanup scheduler | 日志包含 `system maintenance cleanup completed` 或失败状态；媒体临时分片和数据库残留可解释 |  |  |
| Traffic probe scheduler | `/admin/probes` 与 `/admin/traffic-hijack` 可读；旧结果裁剪无异常噪声 |  |  |

- 观测记录位置：

## 回滚计划

<!-- release-section:rollback-plan -->

- 上一版本产物：
- 回滚命令：
- schema 回滚：
- 数据恢复：
- 预计回滚耗时：
- 回滚触发条件：
- 通知对象：

## 发布后观察

<!-- release-section:post-release-observation -->

- 观察开始：
- 观察结束：
- 5xx：
- 登录与会话：
- 初始化流程：
- 后台核心页面：
- 残余风险：
