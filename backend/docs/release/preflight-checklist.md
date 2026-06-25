# 发布前检查与证据模板

本文档用于生产或类生产发布前审查。它不替代 CI、测试和人工评审，而是把发布所需的证据固定下来，避免迁移、备份、回滚和可观测性只停留在口头确认。

适用场景：

- 发布后端服务、React WebUI、Docker 镜像或发布包。
- 变更数据库迁移、配置、密钥、存储、缓存、CORS、认证、权限或静态托管路径。
- 通过 `.github/workflows/deploy-remote.yml`、`deploy.sh`、Compose 或人工部署方式更新环境。

不适用场景：

- 本地临时调试。
- 只修改不会发布的文档草稿。
- 没有部署动作的代码审查记录。

## 发布前必查项

### 1. 版本与产物

- 确认发布分支、提交 SHA、标签和变更范围。
- 确认发布产物来自同一个提交：服务二进制、Docker 镜像、`scripts/package.py` 发布包和 `web/app/build/client`。
- 发布 Docker 镜像时记录镜像名、标签、摘要和构建命令。
- 如果使用 GitHub Actions 证明容器 smoke，记录 workflow run URL、提交 SHA 和 `docker-smoke-evidence` artifact；该 artifact 来自 CI 中的 `build/reports/docker-smoke-ci.log`。
- 发布容器时记录 CPU、内存、PID 限制、停止宽限期和健康检查策略。
- 发布压缩包时记录 `build/releases/**/manifest.json`、包名和校验信息。

建议命令：

```powershell
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
pnpm --dir web/app build
python scripts/package.py
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
```

默认发布包使用 `CGO_ENABLED=0` 时不能使用 SQLite 运行态；发布包部署优先选择 PostgreSQL/MySQL。`scripts/check-package-sqlite-boundary.ps1` 会检查 `package.py --dry-run`、包内 README 和 `manifest.json` 的 SQLite/CGO 标记是否一致，但不替代目标平台 `--cgo` 发布包 smoke。

### 2. 数据库迁移

- 发布前必须执行迁移状态检查。
- 新迁移必须按风险分类：新增型、变更型、破坏型。
- 生产环境不应依赖自动迁移作为唯一发布手段，发布记录中必须写明本次迁移由谁、何时、在哪个配置下执行。
- 破坏型迁移，例如删除表、删除列、批量删除数据、不可逆字段收窄，必须有明确人工确认、备份和恢复计划。

建议命令：

```powershell
go run ./cmd/console db migrate status --config=<生产配置路径>
go run ./cmd/console db migrate up --config=<生产配置路径>
```

`deploy/config.production.example.yaml` 只用于生成生产配置模板，真实发布应使用目标环境已经注入密钥和环境变量后的配置文件，例如 `/opt/console-platform/configs/config.yaml`。

迁移风险分类：

| 类型 | 示例 | 发布要求 |
| --- | --- | --- |
| 新增型 | 新表、新 nullable 字段、新索引 | 可随版本发布，但仍需记录状态和验证结果 |
| 变更型 | 数据回填、约束调整、字段类型扩展 | 必须在预发或同等数据量环境验证耗时和锁影响 |
| 破坏型 | 删除表、删除列、清空数据、字段收窄 | 默认不得直接发布，必须拆分为扩展和收缩步骤，并记录恢复方案 |

### 3. 配置、环境变量与密钥

- 新增或修改配置项时，确认 `configs/config.example.yaml`、`configs/examples/*.example.yaml`、`deploy/config.production.example.yaml`、`.env.example` 和文档已经同步。
- 密钥只能出现在环境变量、CI secret 或部署系统中，不得写入文档、截图、日志或提交记录。
- 认证密钥必须至少包含：
  - `APP_AUTH_SIGNING_KEY`
  - `APP_AUTH_REFRESH_TOKEN_PEPPER`
  - `APP_AUTH_MFA_SECRET_KEY`
- 数据库、缓存、品牌、认证、存储和 i18n 变量必须使用当前命名，例如 `APP_DB_*`、`APP_CACHE_*`、`APP_BRAND_*`、`APP_AUTH_*`、`APP_STORAGE_*`、`APP_I18N_*`。不要恢复旧变量名或旧部署参数。

### 4. 验证命令

按变更范围记录实际执行的命令。最小发布证据应包含：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-deployment-guardrails.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
go test ./internal/config ./internal/transport/http -count=1 -mod=readonly
go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId <workflow-run-id> -CommitSha <commit-sha>
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
git diff --check
```

涉及 API contract 时额外执行：

```powershell
go run ./cmd/console api openapi --output docs/api/openapi.yaml
go test ./internal/transport/http -count=1 -mod=readonly
```

涉及可见 UI、认证流、初始化流或后台核心流程时，补充前端测试和浏览器检查：

```powershell
pnpm --dir web/app test
pnpm --dir web/app test:e2e
```

### 5. 运行态烟测

发布前或发布后必须至少覆盖以下路径：

| 路径 | 期望 |
| --- | --- |
| `/health` | 服务存活，返回 `status=ok` |
| `/ready` | 数据库、依赖和服务就绪 |
| `/openapi.yaml` | 主系统 OpenAPI 可下载 |
| `/` | React WebUI 静态入口可访问 |
| `/setup` | 首次安装流程入口可访问 |
| `/admin` | 后台控制台入口可访问 |

本地烟测方法见 [测试矩阵](../testing/test-matrix.md)。

### 6. 可观测性

- 确认结构化日志进入目标位置，至少能按时间、级别、请求路径和 trace id 检索。
- 确认 `/ready` 在发布前后均返回可解释状态。
- 确认容器或进程收到停止信号后能在停止宽限期内退出；无法在当前环境验证时，发布证据中必须记录目标环境补证计划。
- 如启用系统探针、流量探针或运行状态面板，记录最近一次探针结果。
- 如变更认证、权限、菜单、系统配置、媒体或 API Token，记录操作审计和错误日志观察结果。
- 若本次变更涉及已知 best-effort 或后台补偿路径，例如媒体临时分片清理、探针旧结果裁剪、通知投递或缓存刷新，必须在发布说明中记录残余风险和目标环境观测计划。
- IAM policy reload、IAM notification outbox、System maintenance cleanup 和 traffic probe 等后台补偿路径必须使用 [后台补偿观测记录模板](operational-observation-template.md) 或等价发布单记录目标环境日志、后台页面、审计和残余风险。

### 7. 回滚准备

- 发布前必须确认上一版本产物可用，包括镜像标签、发布包路径或可重新构建的提交 SHA。
- 发布前必须记录部署标签或可回滚引用，例如镜像 digest、Git tag、release 包 manifest 或部署系统 revision。
- 回滚命令必须提前写好，不能等故障发生后临时拼接。
- 如果本次包含数据库迁移，说明是否需要 schema 回滚或数据恢复。
- 如果 schema 回滚会丢数据，应优先按备份恢复说明处理，不得只写“执行 migrate down”。
- 写明回滚触发条件，例如 5xx 明显升高、登录失败、初始化流程不可用、`/ready` 失败或后台核心页面不可访问。

## 证据记录模板

复制以下模板到发布 PR、发布单或运维记录中。密钥值必须脱敏。

本地或类生产发布前，可以先用脚本生成一份最小运行态烟测证据：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
bash scripts/docker-smoke.sh
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -SelfTest
```

`release-preflight.ps1` 用于编排本地发布前 gate；`check-local-tooling.ps1` 用于提前识别 Go、Node、pnpm/corepack、Python、GitHub CLI、Docker 和 Bash 的可用性，避免把工具缺失误写成发布证据；`check-plugin-removal.ps1` 用于固定插件系统已移除、配置示例无插件块、生产交付面无插件 API 的边界；`check-error-result-boundaries.ps1` 用于固定生产 Go 代码中显式忽略错误的 allowlist，避免新工具库、service 或运行时装配无说明吞掉错误；`check-agent-skills.ps1` 用于验证 `.agents/skills` 的 front matter、仓库级 OpenAI 元数据和默认触发提示；`check-doc-readmes.ps1` 用于验证关键目录 README 覆盖，防止新模块、脚本或前端目录缺少开发说明；`check-doc-links.ps1` 用于验证根 README、AGENTS、仓库级 skill、`docs/**`、关键源码 README 和 React 前端文档的相对链接、图片路径和 Markdown 锚点，防止发布说明、任务计划、目录索引或 skill 使用说明出现断链；`check-operational-observation-template.ps1` 用于固定 IAM 授权策略重载、IAM 通知投递队列、System 维护清理和流量探针等后台补偿观测模板结构；`check-worktree-convergence.ps1` 用于统计当前变更规模，并拦截 `.env`、本地配置、根级运行态目录、生成目录或测试报告混入当前变更或 Git 跟踪文件；`runtime-smoke.ps1` 可以证明当前提交在本机临时 SQLite 环境下能启动并暴露关键端点；`docker-smoke.ps1` 和 `docker-smoke.sh` 可以在具备 Docker 的 Windows、Linux、macOS 或 CI 环境证明镜像构建、容器启动和关键端点可访问；`check-ci-docker-evidence.ps1` 可以在 GitHub Actions 产出 `docker-smoke-evidence` 后校验 workflow run、提交、artifact 和 `docker-smoke-ci.log` 内容。这些脚本都不能替代生产数据库、备份、回滚和真实目标环境 smoke。
`check-package-sqlite-boundary.ps1` 用于固定发布包 SQLite/CGO 边界，确认默认 `CGO_ENABLED=0` 会明确提示 SQLite 不可用，`--cgo` dry-run 会明确提示 SQLite 可用，并检查包内 README 与 manifest 字段仍由 `scripts/package.py` 生成；它不能替代目标平台 CGO/SQLite 二进制 smoke。

发布证据模板已独立沉淀在 [发布证据模板](release-evidence-template.md)。复制模板并填写目标环境结果后，运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -Path <发布证据文件>
```

校验脚本会检查迁移、备份、配置密钥、验证命令、烟测、可观测性、后台补偿观测和回滚结构，并拒绝明显空占位、`TBD`、`TODO`、`未执行`、`未验证`、`skipped`、`not run`、空结果表格和疑似明文密钥。不要从本文件手动拼接发布证据；必须复制 [发布证据模板](release-evidence-template.md)，避免模板副本和校验脚本继续漂移。

## 禁止事项

- 不得把 `configs/config.yaml` 或本地派生配置当作生产事实来源。
- 不得在发布证据中粘贴未脱敏密钥、连接串、Token 或 Cookie。
- 不得跳过迁移状态检查后直接执行发布。
- 不得在破坏型迁移没有备份和恢复计划时继续发布。
- 不得恢复已删除的插件运行时、旧部署变量或旧品牌命名。
- 不得把 Docker、Bash、Playwright 等本地工具缺失写成通过验证；必须记录为环境限制和残余风险。
