# 构建与容器

## 本机构建

Windows 执行：

```powershell
./scripts/Verify-Quality.ps1
```

Linux 执行：

```bash
bash scripts/verify-quality.sh
```

两个入口都会验证格式、`go.mod`、生成物、test、race、vet、CGO-free build 和禁止跟踪的产物。安全扫描由 CI 的独立门禁执行，避免把“本机没有扫描器”静默视为通过。

这两个 `Verify-Quality` 入口是 Go 后端与仓库产物门禁，不安装 Node/pnpm，也不执行 WebUI 的 lint、typecheck、unit、build、E2E 或 registry clean check。WebUI 另有 `./scripts/Verify-WebUI.ps1` 与 `bash scripts/verify-webui.sh`，固定执行生成检查、冻结安装、lint、模块 lint、typecheck、test 和 build；文档拓扑与变更影响另有 `./scripts/Verify-Docs.ps1` 与 `bash scripts/verify-docs.sh`。这些入口都不启动 Go 服务或 Playwright。只运行任一单一入口不得表述为“项目全部质量门禁通过”。

`.github/workflows/quality.yml` 分别提供 Windows/Linux Go、WebUI 和 Docs 静态 job；正式 release job 也会在 Go/WebUI gate 前运行 Linux Docs 和 WebUI 静态入口。Playwright E2E、视觉、外部协议和容器 runtime 仍是独立验收，不因这些静态 job 通过而自动完成。

## OCI image

`Dockerfile` 的 builder、webui 与 distroless runtime 都按 digest 固定。webui 构建 stage（`webui-build`，node:24-bookworm）在镜像构建期执行冻结安装与 `pnpm build`，把 `webui/dist` 复制进 runtime；registry 与 tsconfig 是已提交且经质量门禁校验的生成物，stage 不做代码生成。运行层使用 `nonroot`、没有 shell；镜像不内置凭据，也不把 migration 或 WebUI 构建隐藏在 Service startup 中。

```bash
docker build \
  --build-arg VERSION=v1.0.0-rc.1 \
  --build-arg COMMIT="$(git rev-parse HEAD)" \
  --build-arg BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --build-arg DIRTY=false \
  -t go-scaffold-template:v1.0.0-rc.1 .
bash scripts/container-smoke.sh go-scaffold-template:v1.0.0-rc.1
```

`container-smoke.sh` 在 management 探针之后断言模式 B：业务 listener（8080）首页返回应用 HTML，且 `/api/v1` 路径不回退 HTML。生产编排必须显式提供只读配置、可写数据卷、business/management 网络政策以及外部 probe。distroless 镜像没有 shell，所以不要添加依赖容器内 `curl` 的 `HEALTHCHECK`；使用 `/startupz`、`/livez` 和 `/readyz` 的外部探针。

SQLite 需要把 `/app/.data` 挂为 nonroot 可写卷。根文件系统应保持 read-only，并为确有需要的临时文件提供受限 tmpfs。SIGTERM 的成功标准是停止 admission、完成有界 drain 并以 0 退出。
