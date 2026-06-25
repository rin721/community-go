# 入口与品牌收敛审计：2026-06-23

本文记录第一组“入口与品牌命名收敛”的当前事实、检查脚本和剩余风险。它用于拆分 PR 或发布前核验，不替代完整构建、Docker 运行和生产部署证据。

## 当前事实

以当前代码为准：

- Go module path 为 `github.com/open-console/console-platform`。
- 当前唯一 Go 入口目录是 `cmd/console`；旧入口目录不存在。
- Dockerfile 使用 `go build ... ./cmd/console`，运行时二进制为 `/app/console-server`。
- CI 使用 `go build ... ./cmd/console`，Docker 镜像标签为 `console-platform:ci`，并执行 `scripts/docker-smoke.sh`。
- 发布包脚本 `scripts/package.py` 的默认二进制名是 `console-server`，构建入口为 `./cmd/console`。
- 示例配置和部署脚本使用 `Console Platform`、`console-platform`、`APP_*` 等中性或可配置命名。

## 新增检查

新增 `scripts/check-entry-brand-convergence.ps1`，它只读检查以下内容：

- 必需入口、部署、配置和文档路径存在。
- `cmd/aoi` 不存在。
- Go module path、Dockerfile、CI、发布包脚本、部署脚本和配置示例指向当前中性入口。
- 入口和部署交付面不存在旧品牌、旧脚手架、旧请求头或旧入口残留。

单独运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
```

该脚本已接入 `scripts/release-preflight.ps1` 默认 gate，也被 `scripts/check-open-source-readiness.ps1` 纳入必查路径。

## 架构影响

本阶段没有改变运行时行为。新增脚本把第一组拆分 PR 的验收边界从人工 grep 变成可重复检查：

- 入口层继续保持轻薄，只负责进程适配。
- 发布、Docker、CI 和安装脚本统一指向当前入口。
- 品牌默认值继续通过配置和环境变量覆盖，不把旧项目名写回交付面。

## 验证命令

本阶段应至少执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
go test ./cmd/console -count=1 -mod=readonly
go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
```

本轮已执行并通过：

```text
entry and brand convergence check passed.
required paths checked: 17
removed paths checked: 1
entry files scanned: 13
```

补充说明：根目录 `README.md` 是项目代号、徽章、Logo 和仓库品牌叙事入口，允许保留 Aoi 项目代号；脚本仍会检查根 README 不得恢复旧脚手架、旧入口或旧运行时 header。运行时代码、配置默认值、部署脚本和前端生产文案不享受该例外。

补充验证：

- `go test ./cmd/console -count=1 -mod=readonly` 通过。
- `go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console` 通过。
- `scripts/release-preflight.ps1` 默认 gate 通过，结果表已包含 `entry brand convergence` 步骤。
- 交付面旧入口、旧品牌和旧脚手架扫描无输出；`configs/config.local.yaml` 是 `.gitignore` 明确忽略的本地派生配置，不作为交付事实，本阶段未修改。

## 剩余风险

- 当前机器仍缺少 Docker CLI 和 Bash，本机不能证明 Docker 镜像构建和容器运行；需要目标环境或 CI 补证。
- 本地已形成干净提交边界；入口收敛仍可作为对外审查或 PR 拆分时的第一组说明。
- 部署脚本的真实远程安装流程需要目标仓库地址和 Docker 环境，当前只能做静态脚本检查。

## 审计结论

入口与品牌命名收敛方向与开源平台目标一致。后续若单独拆第一组 PR，应优先保留本脚本、入口 README、根 README、AGENTS、Docker、CI、发布包和部署脚本在同一审查范围内，并在干净分支复跑上述验证命令。
