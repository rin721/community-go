# CI Docker 证据校验脚本审计：2026-06-23

本文记录 `scripts/check-ci-docker-evidence.ps1` 的新增依据、执行边界和验证结果。它用于把 GitHub Actions 产出的 Docker smoke artifact 从“发布记录里粘贴一个链接”提升为可重复校验的证据。

## 当前阶段

第九阶段：测试、可观测性、部署和发布证据。

## 分析结果

当前 CI workflow 已配置在 Docker build 后执行 `bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke`，并上传 `docker-smoke-evidence` artifact。CI 会在 `pull_request`、`main` / `master` push 和 `codex/**` 分支 push 时运行，方便 Codex 工作分支在不直接推送 `main` 的情况下取得 Docker smoke artifact。发布证据模板也要求记录 `CI Workflow Run` 和 `Docker Smoke Artifact`；只有当前提交的远端 run 通过并产出 artifact 后，才能把它作为容器 smoke 证据。

缺口在于：发布负责人可以填写 run 链接和 artifact 名称，但仓库里没有脚本校验该 run 是否成功、提交 SHA 是否匹配、artifact 是否存在且未过期，也没有校验 `docker-smoke-ci.log` 是否真的包含 `/health`、`/ready`、`/openapi.yaml` 和 `/admin` 的 smoke 输出。

## 变更内容

- 新增 `scripts/check-ci-docker-evidence.ps1`。
- `.github/workflows/ci.yml` 支持 `codex/**` 分支 push 触发 CI。
- `.github/workflows/ci.yml` 在 `actions/setup-node` 启用 `cache: pnpm` 前先通过 Corepack 固定 `pnpm@10.22.0`，避免 GitHub runner 找不到 `pnpm` 时直接跳过后续 Go、WebUI、Docker build 和容器 smoke。
- `scripts/release-preflight.ps1` 默认 gate 增加该脚本的 `-SelfTest`，不访问网络。
- `docs/release/release-evidence-template.md` 和 `docs/release/preflight-checklist.md` 增加 CI Docker 证据校验命令。
- `scripts/check-release-evidence.ps1` 要求发布证据模板包含 `scripts/check-ci-docker-evidence.ps1`。
- `scripts/check-open-source-readiness.ps1` 将该脚本和本文纳入关键路径。

## 设计边界

- `-SelfTest` 只校验脚本自身的 metadata 和日志内容判断逻辑，不访问 GitHub。
- `-LogPath <docker-smoke-ci.log>` 可离线校验已下载日志，适合没有 GitHub CLI 或网络的归档场景。
- `-RunId <workflow-run-id> -CommitSha <commit-sha>` 需要 GitHub CLI，并会校验 workflow run 成功、提交匹配、artifact 存在且未过期，然后下载 artifact 到 `tmp/ai/ci-docker-evidence/**` 检查日志内容。
- 该脚本只能证明 CI 的 Docker smoke artifact 与指定提交一致，不能替代生产数据库、备份、回滚、目标环境资源限制和发布后观察。

## 验证结果

远端 CI 触发复查：

- 已将 `codex/platform-readiness-ci-evidence` 推送到远端并触发 CI run `28024416258`。
- 该 run 失败在 `Setup Node`，日志显示 `actions/setup-node@v4` 使用 `cache: pnpm` 时无法定位 `pnpm` 可执行文件。
- 本次修复将 Corepack pnpm 准备步骤前移到 `Setup Node` 之前，并把 `corepack prepare pnpm@10.22.0 --activate` 加入 `scripts/check-deployment-guardrails.ps1`，防止 CI 再次在 pnpm cache 阶段漂移。
- 修复后触发 CI run `28024674402`，`Enable pnpm`、`Setup Node` 和 `Install WebUI dependencies` 已通过，说明 pnpm cache 顺序修复有效；该 run 随后失败在 `Check repository governance gates`，原因是 `scripts/check-plugin-removal.ps1` 对可选扫描文件执行 `Get-Item` 时出现未捕获异常，没有继续执行后续治理检查。
- 本次继续修复 `scripts/check-plugin-removal.ps1`：配置候选文件缺失时跳过，无法读取时记录失败；生产交付面 root 无法读取时跳过，由 readiness 必备路径检查负责证明关键路径存在。
- 继续触发 CI run `28024930447` 后，Node/pnpm 仍通过，`check-plugin-removal.ps1` 已不再未捕获异常，但仍把 `.env.example` 的可选读取失败记录为 failure；随后 `scripts/check-open-source-readiness.ps1` 暴露相同的可选文件 `Get-Item` 模式。
- 本次同步修复 `scripts/check-plugin-removal.ps1` 和 `scripts/check-open-source-readiness.ps1`：可选扫描文件在 `Get-Item` 失败时跳过，不把候选文件扫描等同于必备路径检查；必备交付路径仍由 readiness 的 `requiredPaths` 断言负责。
- 继续触发 CI run `28025135136` 后，仓库治理 gate、`go test ./...`、后端构建和 WebUI i18n lint 已通过，失败推进到 `pnpm -C web/app lint`；日志指向 `/admin/notification-outbox` 的 hook dependency 和 unknown ID stringification 问题。
- 本次同步修复 `web/app/app/routes/admin/notification-outbox.tsx`：权限描述函数改为 `useCallback` 并纳入 `useMemo` 依赖，ID 比较通过显式类型收窄后再字符串化。
- 继续触发 CI run `28025558969` 后，仓库治理 gate、Go 测试、后端构建、WebUI i18n、lint、typecheck、unit test、WebUI build 和 Docker image build 均已通过；容器 smoke 失败于配置预检，原因是生产配置默认 `notification_driver=smtp`，但 smoke 环境没有注入 SMTP host/from。
- 本次同步修复 `scripts/docker-smoke.ps1` 和 `scripts/docker-smoke.sh`：容器 smoke 显式注入 `APP_AUTH_NOTIFICATION_DRIVER=debug`，让 smoke 证明镜像、配置覆盖、静态托管和关键端点，不依赖外部 SMTP。
- 继续触发 CI run `28026853894` 后，仓库治理 gate、Go 测试、后端构建、WebUI i18n、lint、typecheck、unit test、WebUI build 和 Docker image build 均已通过；容器 smoke 失败于 `/openapi.yaml` 内容断言，日志显示端点返回 200，但 Bash smoke 仍只匹配 YAML `openapi: 3` 格式。
- 本次同步修复 `scripts/docker-smoke.sh`：OpenAPI 断言改为接受运行时实际返回的 JSON `"openapi": "3.0.3"` 格式，与 PowerShell smoke 保持一致。
- 继续触发 CI run `28027448099` 后，容器 smoke 仍失败于 `/openapi.yaml` 内容断言；日志显示 `scripts/docker-smoke.sh: line 99: printf: write error: Broken pipe`，原因是 `set -o pipefail` 下 `printf | grep -q` 在匹配成功后会因 grep 提前退出而让 printf 返回非零。
- 本次同步修复 `scripts/docker-smoke.sh`：端点内容匹配改为 `grep -Eq ... <<<"${body}"`，避免管道 broken pipe 影响 smoke 结果。
- 继续触发 CI run `28028092130` 后，仓库治理 gate、Go 测试、后端构建、WebUI i18n、lint、typecheck、unit test、WebUI build、Docker image build、容器 smoke、Docker smoke evidence 上传和 whitespace 检查均已通过；该 run 对应提交 `4f6febb831da4948587c344d0966fee33cd79d84`。
- 本机执行 `scripts/check-ci-docker-evidence.ps1 -RunId 28028092130 -CommitSha 4f6febb831da4948587c344d0966fee33cd79d84` 通过，已校验远端 run 成功、提交 SHA 匹配、artifact 存在且 `docker-smoke-ci.log` 包含 `/health`、`/ready`、`/openapi.yaml` 和 `/admin` 端点 smoke 输出。
- 将同一变更 fast-forward 到 `main` 后触发 CI run `28029100140`，该 run 对应提交 `363aebe694703ec1349e5d5e3e427b8a76f02d5b`，Go verify、WebUI 检查、Docker image build、容器 smoke、Docker smoke evidence 上传和 whitespace 检查均已通过。
- 本机执行 `scripts/check-ci-docker-evidence.ps1 -RunId 28029100140 -CommitSha 363aebe694703ec1349e5d5e3e427b8a76f02d5b` 通过，说明 main 当前提交已有可复查的 CI Docker 容器运行证据；本机 Docker CLI 缺失仍作为本地环境限制记录。

本轮已执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId 28028092130 -CommitSha 4f6febb831da4948587c344d0966fee33cd79d84
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId 28029100140 -CommitSha 363aebe694703ec1349e5d5e3e427b8a76f02d5b
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
git diff --check
```

结果：

- CI Docker 证据校验脚本自检通过。
- 发布证据模板结构校验通过，并已包含 CI Docker 证据校验命令。
- 发布证据校验器自检通过。
- 开源 readiness 检查通过。
- 默认发布前 gate 通过，并已包含 CI Docker 证据校验器自检。
- CI Docker artifact 远端证据校验通过。
- main 当前提交的 CI Docker artifact 远端证据校验通过。
- `git diff --check` 无空白错误。

## 剩余问题

- 当前本机仍无法直接运行 Docker CLI；当前 main 提交的 Docker 容器真实运行证据已由 GitHub Actions run `28029100140` 和 `scripts/check-ci-docker-evidence.ps1` 提供，生产发布仍需目标环境补充数据库、备份、回滚和发布后观察证据。
- CI run `28024416258` 失败于 Node/pnpm 准备阶段，没有进入 Docker build 和容器 smoke，不能作为 Docker 证据。
- CI run `28024674402` 失败于仓库治理 gate，没有进入 Docker build 和容器 smoke，不能作为 Docker 证据。
- CI run `28024930447` 失败于仓库治理 gate，没有进入 Docker build 和容器 smoke，不能作为 Docker 证据。
- CI run `28025135136` 失败于 WebUI lint，没有进入 Docker build 和容器 smoke，不能作为 Docker 证据。
- CI run `28025558969` 失败于 Docker 容器 smoke，镜像构建已通过，但容器端点未就绪；仍不能作为完整 Docker 证据。
- CI run `28026853894` 失败于 Docker 容器 smoke，镜像构建已通过，`/health`、`/ready` 和 `/openapi.yaml` 均有请求记录，但 Bash OpenAPI 内容断言不兼容运行时 JSON 响应；仍不能作为完整 Docker 证据。
- CI run `28027448099` 失败于 Docker 容器 smoke，镜像构建已通过，`/health`、`/ready` 和 `/openapi.yaml` 均有请求记录，但 Bash smoke 的管道匹配在 `pipefail` 下被 broken pipe 影响；仍不能作为完整 Docker 证据。
- CI run `28028092130` 已通过完整 Docker build、容器 smoke 和 artifact 上传，并已通过 `scripts/check-ci-docker-evidence.ps1` 校验，可作为提交 `4f6febb831da4948587c344d0966fee33cd79d84` 的 CI Docker 证据。
- CI run `28029100140` 已在 `main` 上通过完整 Docker build、容器 smoke 和 artifact 上传，并已通过 `scripts/check-ci-docker-evidence.ps1` 校验，可作为提交 `363aebe694703ec1349e5d5e3e427b8a76f02d5b` 的 CI Docker 证据。
