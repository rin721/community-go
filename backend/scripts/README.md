# scripts 目录说明

`scripts` 存放本地验证、发布打包和工程辅助脚本。脚本应服务当前开源后台管理 / 控制台平台的真实入口，不得恢复旧入口、旧品牌名或已删除的插件系统。

## 当前脚本

| 文件 | 用途 |
| --- | --- |
| `package.py` | 构建多平台发布包，包含服务二进制、React WebUI 静态产物、配置示例和校验信息。 |
| `package.ps1` | PowerShell 包装入口，用于在 Windows 环境调用 `package.py`。 |
| `package.sh` | Shell 包装入口，用于在类 Unix 环境调用 `package.py`。 |
| `check-release-evidence.ps1` | 发布证据校验脚本，检查发布记录的迁移、备份、密钥、验证命令、烟测、可观测性和回滚结构。 |
| `check-operational-observation-template.ps1` | 后台补偿观测模板检查脚本，验证 IAM、System、流量探针和敏感信息脱敏等目标环境观测项未从模板中漂移。 |
| `check-ci-docker-evidence.ps1` | CI Docker 证据校验脚本，检查 GitHub Actions run、`docker-smoke-evidence` artifact 和 `docker-smoke-ci.log` 端点输出。 |
| `check-package-sqlite-boundary.ps1` | 发布包 SQLite/CGO 边界检查脚本，复跑 `package.py --dry-run` 的 CGO=0/1 两种计划，并检查包内 README 与 manifest 字段不会漂移。 |
| `check-deployment-guardrails.ps1` | 部署防线检查脚本，验证 Dockerfile、Compose、CI 和发布证据模板保留镜像、健康检查、资源限制、非 root、容器 smoke 与回滚证据边界。 |
| `check-local-tooling.ps1` | 本机工具检查脚本，报告 Go、Node、pnpm/corepack、Python、GitHub CLI、Docker 和 Bash 的可用性，区分必需工具与外部补证工具。 |
| `check-error-result-boundaries.ps1` | 错误与结果边界检查脚本，扫描生产 Go 代码中显式忽略的错误候选，并要求新增忽略行为先处理或加入说明明确的 allowlist。 |
| `release-preflight.ps1` | 发布前本地 gate 编排脚本，默认执行入口与品牌收敛、工作树收敛审计和核心静态验证，可显式启用完整构建、运行烟测、Docker 烟测和发布包 dry-run。 |
| `visual-qa.ps1` | 视觉 QA 编排脚本，运行代表性 Playwright 桌面/移动端截图用例并校验截图产物数量。 |
| `runtime-smoke.ps1` | 本地真实进程烟测脚本，自动构建服务、使用临时 SQLite 启动、检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`。 |
| `docker-smoke.ps1` | Docker 容器烟测脚本，在具备 Docker 的环境构建镜像、启动临时容器并检查关键端点。 |
| `docker-smoke.sh` | Linux/macOS/CI 使用的 Docker 容器烟测脚本，可复用已构建镜像并检查关键端点。 |
| `check-open-source-readiness.ps1` | 开源可用性只读检查脚本，验证关键 README、任务计划入口、构建与 CI、CLI 工作流、已知缺口、维护指南入口、错误与结果边界 gate 入口、已删除插件路径、旧品牌命名、locale 文件和配置示例边界。 |
| `check-doc-readmes.ps1` | README 覆盖只读检查脚本，验证应用入口、文档、后端分层、工具库、全局类型和 React 前端关键目录都有非空 README。 |
| `check-doc-links.ps1` | Markdown 相对链接只读检查脚本，验证根 README、AGENTS、仓库级 skill、`docs/**`、关键源码 README 和 React 前端文档中的文件、目录和 Markdown 锚点目标存在。 |
| `check-agent-skills.ps1` | Agent skill 只读检查脚本，验证 `.agents/skills` 的 `SKILL.md` front matter、仓库级 skill 元数据和 OpenAI 触发提示。 |
| `agent-skill-registry.ps1` | 仓库级 Agent skill 注册表，被 skill 结构检查、文档链接检查和开源 readiness 共同读取，避免多处维护 skill 名单。 |
| `check-entry-brand-convergence.ps1` | 入口与品牌收敛只读检查脚本，验证 `cmd/console`、中性 module path、Docker/CI/打包入口和部署命名未回退到旧入口或旧品牌。 |
| `check-plugin-removal.ps1` | 插件系统移除只读检查脚本，验证插件运行时、协议、配置、迁移、前端入口已删除，并确认模块化替代路径存在。 |
| `check-worktree-convergence.ps1` | 工作树收敛只读检查脚本，统计当前变更规模，并拦截运行态、生成目录或本地配置出现在变更或 Git 跟踪文件中。 |

## 使用规则

- 脚本必须从仓库根目录运行，或显式处理工作目录。
- 脚本不得写入 `configs/config.yaml`、`configs/config.local.yaml`、`data/` 或本地环境文件。
- 需要临时数据时优先写入 `tmp/ai/**`，并在文档中说明清理方式。
- 新增脚本必须同步更新本文档、`docs/testing/test-matrix.md` 或发布文档中的相关命令。
- 失败时应返回非零退出码，并保留足够日志帮助定位问题；不要只打印警告后继续返回成功。

## 本地运行烟测

首次接手仓库或准备发布候选前，先运行本机工具检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
```

默认检查会要求 `git`、`go`、`node` 和 `pnpm` / `corepack` 可用，并把 `python`、`gh`、`docker` 和 `bash` 标为推荐或外部补证工具。发布包或 CI artifact 校验前可以加上 `-RequireReleaseTools`；在具备容器能力的目标环境补证时可加上 `-RequireDocker` 或 `-RequireBash`，让缺失工具直接导致失败。

在已构建 React WebUI 静态产物后运行：

```powershell
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
```

默认行为：

- 构建 `./tmp/console-runtime-smoke.exe`。
- 使用 `configs/config.example.yaml`。
- 覆盖端口为 `127.0.0.1:19999`。
- 使用 `tmp/ai/runtime-smoke/app.db`、`tmp/ai/runtime-smoke/uploads` 和 `tmp/ai/runtime-smoke/app.log`。
- 启动后依次检查 `/health`、`/ready`、`/openapi.yaml`、`/admin`。
- 检查结束后停止进程。

自定义端口或目录：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1 -Port 29999 -WorkDir tmp/ai/my-smoke
```

## 开源可用性检查

发布前或阶段收口时运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
```

脚本会检查关键说明文档、总任务计划与 PR 拆分计划入口、构建与 CI、CLI 工作流、已知缺口、已删除插件交付路径、受控配置示例、前后端 locale 文件、旧品牌命名和生产交付面的插件残留。该脚本只读，不会修改配置、生成数据或启动服务。

## README 覆盖检查

新增或调整重要目录后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
```

脚本会检查根入口、`docs`、`internal`、`internal/modules`、`pkg`、`types`、`web/app` 和 React 前端关键目录是否存在非空 `README.md`，并要求 README 至少包含 Markdown 标题。它已接入 `check-open-source-readiness.ps1` 和默认 `release-preflight.ps1` gate。

## 文档链接检查

新增或调整 README、`docs/**`、仓库级 skill、任务计划、发布说明、目录索引或关键源码目录说明中的相对链接后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
```

脚本默认扫描根 `README.md`、`AGENTS.md`、仓库级 skill、`docs/**`、`cmd`、`configs`、`deploy`、`internal`、`pkg`、`types`、`scripts` 和 `web/app` 关键文档目录，会跳过外部 URL、邮件、电话和代码块中的示例链接，检查 Markdown 链接和图片里的相对路径是否存在；当链接指向 Markdown 锚点时，也会按 GitHub 风格标题 slug 校验锚点。它只读，不会访问网络、启动服务或修改文件，并已接入 `check-open-source-readiness.ps1` 和默认 `release-preflight.ps1` gate。

## Agent skill 检查

新增或调整 `.agents/skills` 后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
```

仓库级 skill 名单统一维护在 `scripts/agent-skill-registry.ps1`，`check-agent-skills.ps1`、`check-doc-links.ps1` 和 `check-open-source-readiness.ps1` 会共同读取该注册表。脚本会检查所有 skill 的 `SKILL.md` 是否包含可解析的 front matter、目录名是否与 `name` 一致、`description` 是否存在，并要求 `.agents/skills` 下的 skill 以普通仓库文件自包含，不得提交为 gitlink/submodule；对仓库级维护、开源 readiness、文档治理、构建 CI、配置治理、新开发者入门、首次安装闭环、模块开发、IAM 治理、系统运维、API 契约、插件移除、WebUI/i18n、发布验收、CLI/运行时生命周期、可观测性、错误结果契约、数据库迁移数据治理、阶段任务计划、PR 审查、视觉 QA、安全依赖治理和提交规范 skill，会额外要求 `agents/openai.yaml` 存在且包含 `interface.display_name`、`short_description` 和带 `$<skill-name>` 的 `default_prompt`，并拦截旧进程入口、旧脚手架命名、旧 module path 残留和已漂移的命令示例。该脚本只读，不会修改 skill 内容。

## 错误与结果边界检查

修改工具库、service、repository、infrastructure、运行时装配或 CLI 输出后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
```

脚本扫描 `internal`、`pkg` 和 `types` 下的生产 Go 文件，查找显式 `_ =` 丢弃错误、关闭、删除、写入、同步、发送或停止等结果的高风险候选。当前只允许少量已解释的 best-effort 例外，例如临时监听器关闭、HMAC 写入和托管服务控制文件的一次性清理；新增忽略行为必须改为返回错误、记录明确状态，或在脚本 allowlist 中写清业务影响。

## 插件系统移除检查

第二组 PR、模块化扩展、配置示例或前端后台入口变更后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
```

脚本会检查：

- 插件运行时、插件协议、插件 API 包、插件迁移、插件配置示例和前端插件入口已删除。
- `internal/modules` 和模块开发文档作为替代扩展路径存在。
- 受控配置示例和生产交付面没有恢复 `plugins:`、`/plugin-api` 或 `/api/v1/plugins`。

## 入口与品牌收敛检查

第一组 PR、入口命名、部署脚本或发布包脚本变更后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
```

脚本会检查：

- 当前唯一 Go 入口是 `cmd/console`，旧入口目录不存在。
- Go module path、Dockerfile、CI、发布包脚本、部署脚本和配置示例使用中性命名。
- 入口和部署交付面没有旧品牌、旧脚手架、旧请求头或旧入口残留。

## 发布前本地 gate

阶段收口或发布候选前，优先运行默认 gate：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
```

默认 gate 会执行本机工具检查、入口与品牌收敛、插件系统移除、错误与结果边界检查、Agent skill 检查、README 覆盖检查、文档链接检查、开源 readiness、部署防线检查、发布证据模板校验、后台补偿观测模板校验、聚焦 Go 测试、前端 i18n、视觉 QA 脚本语法、Docker PowerShell/Bash 烟测脚本静态检查和 `git diff --check`。它不会启动服务、构建 Docker 镜像或写入生产配置。
默认 gate 也会执行 Agent skill、README 覆盖和文档链接检查，确保 `.agents/skills` 的仓库级工作流具有可触发、可校验的元数据，关键目录说明不会在模块扩展后漂移，根 README、AGENTS、仓库级 skill、`docs/**` 和关键源码 README 的相对链接不会断开。
默认 gate 还会执行 CI Docker 证据校验脚本自检，确认后续用 GitHub Actions artifact 补 Docker 证据时不会只停留在手工说明。
默认 gate 还会执行 `scripts/check-package-sqlite-boundary.ps1`，确认默认发布包 `CGO_ENABLED=0` 时明确提示 SQLite 不可用，`--cgo` 计划明确提示 SQLite 可用，并检查包内 `README.txt` 与 `manifest.json` 的字段来源没有漂移。
默认 gate 也会执行 `check-worktree-convergence.ps1`，用于记录当前变更规模和拦截运行态文件；它不要求工作树干净，除非单独使用 `-FailOnDirty`。

## 部署防线检查

部署、Docker、CI 或发布证据模板变更后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-deployment-guardrails.ps1
```

脚本会检查 Dockerfile 仍使用当前入口、复制 React WebUI 静态产物并以非 root 用户运行；Compose 示例仍包含 `healthcheck`、`no-new-privileges`、资源限制、PID 限制和停止宽限期；CI 仍先执行仓库治理 gate，并在 Docker build 后执行容器 smoke；发布证据模板仍要求记录镜像摘要、资源限制、优雅停止、上一版本产物和回滚条件。

发布候选需要更完整证据时，可以显式打开较重检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke
```

具备 Docker CLI 的目标环境可额外启用容器烟测：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke -IncludeDocker
```

涉及可见 UI、后台流程或发布候选验收时，额外启用视觉 QA：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke -IncludeVisualQA
```

## 视觉 QA

默认代表性截图链路：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
```

默认会运行公开首页、公开公告、后台仪表盘、后台公告管理/无写权限状态和初始化 owner 流程的桌面、移动端用例，截图输出到 `tmp/qa/visual-qa`。脚本会清理旧截图并校验至少生成 12 张截图。

聚焦某一组页面：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -Grep "admin announcements route" -MinimumScreenshots 4
```

全量 Playwright smoke 截图：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -All
```

## 发布证据校验

发布记录建议从 `docs/release/release-evidence-template.md` 复制。模板结构检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
```

校验器自检：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -SelfTest
```

填写后的发布证据检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -Path docs/release/<release-evidence>.md
```

非模板模式会拒绝明显空占位、`TBD`、`TODO`、`未执行`、`未验证`、`skipped`、`not run`、空结果表格和疑似明文密钥。目标环境确实无法完成的项目应在发布前阻塞，而不是写成通过。

## 后台补偿观测模板校验

发布候选需要复核 IAM 授权策略重载、IAM 通知投递队列、System 维护清理和流量探针等后台补偿路径时，先检查目标环境观测模板结构：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1 -SelfTest
```

该脚本只验证 [后台补偿观测记录模板](../docs/release/operational-observation-template.md) 保留必要 marker、scheduler、配置项、后台页面、日志关键字和敏感信息脱敏提醒；它不代表目标环境已经观测通过，正式发布仍必须填写真实日志、后台页面、数据库统计、审计记录和残余风险。

## CI Docker 证据校验

使用 GitHub Actions 的 `docker-smoke-evidence` artifact 证明容器 smoke 时运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId <workflow-run-id> -CommitSha <commit-sha>
```

脚本会通过 GitHub CLI 检查指定 run 已成功完成、`headSha` 与发布提交一致、workflow 名称为 `CI`、artifact 名称为 `docker-smoke-evidence` 且未过期，然后下载 artifact 到 `tmp/ai/ci-docker-evidence/**` 并检查 `docker-smoke-ci.log` 是否包含 `/health`、`/ready`、`/openapi.yaml` 和 `/admin` 的 smoke 输出。

如果已经从 CI 下载了日志，也可以离线校验：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -LogPath <docker-smoke-ci.log>
```

脚本自检不访问网络，可用于本地 gate：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -SelfTest
```

## 工作树收敛审计

阶段收口或拆分 PR 前运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
```

默认行为：

- 统计 `git status --short` 的总条目、修改、删除、未跟踪文件和顶层目录分布。
- 拦截 `.env`、本地配置、根级 `tmp/`、根级 `data/`、`node_modules/`、构建产物、测试报告等不应进入交付面的路径。
- 通过 `git ls-files` 复核上述本地或生成路径没有被版本库跟踪。
- 不要求工作树干净，适合大重构阶段持续观察变更规模。

发布边界需要强制干净工作树时：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1 -FailOnDirty
```

## Docker 容器烟测

在具备 Docker CLI 的 Windows 环境运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

默认行为：

- 构建镜像 `console-platform:local`。
- 启动临时容器 `console-platform-smoke`。
- 映射宿主机端口 `19998` 到容器端口 `9999`。
- 使用容器内 SQLite、临时上传目录和日志路径。
- 使用 `APP_AUTH_NOTIFICATION_DRIVER=debug`，避免容器 smoke 依赖外部 SMTP；生产发布不得复用该通知配置。
- 检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`。
- 检查结束后删除临时容器。

如果已经构建镜像，可跳过构建：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1 -SkipBuild -ImageName console-platform:local
```

在 Linux、macOS 或 GitHub Actions 等 CI 环境运行：

```bash
bash scripts/docker-smoke.sh
bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke
```

CI 中应先构建镜像，再使用 `--skip-build` 复用同一镜像启动临时容器。脚本会检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`，失败时输出容器日志尾部并返回非零退出码。

## 发布包构建

Windows：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package.ps1
```

跨平台 Python 入口：

```powershell
python scripts/package.py --dry-run --target linux/amd64 --version smoke --verbose
```

发布包脚本会调用 Go 构建和 React WebUI 构建。前端依赖必须先通过 pnpm 安装，且不得使用 npm/yarn/bun 写入锁文件。

默认发布包使用 `CGO_ENABLED=0`，SQLite 运行态不可用；`package.py --dry-run`、包内 `README.txt` 和 `manifest.json` 会显式标记该状态。发布包部署应优先选择 PostgreSQL/MySQL。确需 SQLite 时，使用 `python scripts/package.py --cgo ...` 在目标平台或具备对应 C 工具链的环境构建，并补目标环境 smoke 证据。

发布包 SQLite/CGO 边界变更后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
```

该脚本只执行 dry-run，不写入 `build/releases`；它会检查默认 `CGO_ENABLED=0` 输出、`--cgo` 输出，以及 `scripts/package.py` 中写入包内 `README.txt` 和 `manifest.json` 的字段来源。它不能替代目标平台的真实 CGO/SQLite 发布包 smoke。
