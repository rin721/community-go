# 入口与插件移除审计：2026-06-23

本文记录当前工作树在“进程入口收敛、旧命名清理、插件系统移除”三个方向上的事实检查。结论只基于当前代码、目录、包图和扫描命令，不把历史文档作为唯一依据。

## 审计范围

本次审计覆盖：

- Go 包图和模块路径。
- 进程入口目录。
- 插件运行时、插件协议、插件示例和插件 API 路径。
- 可交付范围内的历史品牌词、旧仓库名和旧脚手架名扫描。
- 被忽略本地配置与仓库交付配置的边界。

不覆盖：

- Docker 镜像真实构建。
- 生产环境迁移、密钥注入和回滚演练。
- 所有后台页面的全量视觉 QA。

上述缺口仍以 [最终验收差距审计](final-acceptance-gap-audit-2026-06-23.md) 为准。

## 真实状态

| 检查项 | 当前事实 |
| --- | --- |
| Go 包图 | `go list -mod=readonly ./...` 通过，包路径收敛到 `github.com/open-console/console-platform` |
| 当前进程入口 | `cmd/console` 存在 |
| 旧进程入口 | 旧入口目录不存在 |
| 插件运行时目录 | `internal/plugin`、`pkg/plugin`、`pkg/pluginapi` 不存在 |
| 插件示例与协议文档 | `_examples/remote-plugins`、`docs/api/plugin-protocol` 不存在 |
| 模块化替代路径 | `internal/modules/announcements` 和 `docs/extension/module-blueprint.md` 存在 |
| 本地派生配置 | `configs/config.local.yaml` 被 `.gitignore` 忽略，不作为开源交付事实 |

## 执行命令

### Go 包图

```powershell
go list -mod=readonly ./...
```

结果：通过。输出包列表全部位于 `github.com/open-console/console-platform/...` 下，入口包为 `github.com/open-console/console-platform/cmd/console`。

### 路径存在性

```powershell
$paths = @(
  "cmd/" + "ao" + "i",
  "cmd/console",
  "internal/plugin",
  "pkg/plugin",
  "pkg/pluginapi",
  "_examples/remote-plugins",
  "docs/api/plugin-protocol",
  "internal/modules/announcements",
  "docs/extension/module-blueprint.md"
)

foreach ($p in $paths) {
  "{0}={1}" -f $p, (Test-Path $p)
}
```

结果：

```text
cmd/console=True
internal/plugin=False
pkg/plugin=False
pkg/pluginapi=False
_examples/remote-plugins=False
docs/api/plugin-protocol=False
internal/modules/announcements=True
docs/extension/module-blueprint.md=True
```

旧入口目录检查结果为 `False`。本文不直接写入旧品牌目录全量字面量，避免审计文档本身制造历史命名扫描噪声。

### 运行代码插件残留扫描

```powershell
rg -n -S "internal/plugin|pkg/plugin|pkg/pluginapi|/api/v1/plugins|remote-plugins|plugin-protocol" `
  cmd internal pkg types web/app/app web/app/tests configs deploy .github scripts script Dockerfile go.mod `
  --glob "!**/*.md" `
  --glob "!**/*_test.go" `
  --glob "!web/app/build/**" `
  --glob "!web/app/node_modules/**" `
  --glob "!tmp/**" `
  --glob "!build/**"
```

结果：运行代码、配置、脚本、部署文件中无插件运行时或插件 API 残留。

补充说明：如果扫描范围包含 `docs`、README 和边界测试，会命中“禁止恢复插件路径”的规则说明、历史移除证据和架构边界断言。这些命中不是运行时残留，发布前应区分代码扫描、测试断言与文档证据扫描。

### 旧命名和品牌扫描

```powershell
rg -n -S `
  -e ("cmd/" + "ao" + "i") `
  -e ("github.com/rei0721/go-" + "scaffold") `
  -e ("go-" + "scaffold") `
  -e ("aoi-" + "admin") `
  -e ("Ao" + "i Admin") `
  cmd internal pkg types web/app/app web/app/tests configs deploy .github scripts script Dockerfile go.mod README.md AGENTS.md docs `
  --glob "!configs/config.local.yaml" `
  --glob "!docs/api/openapi.yaml" `
  --glob "!web/app/build/**" `
  --glob "!web/app/node_modules/**" `
  --glob "!tmp/**" `
  --glob "!build/**"
```

结果：仓库交付范围无命中。

`configs/config.local.yaml` 是被忽略的本地派生配置，当前仍可能包含个人本机值、旧品牌值或真实服务测试值，不得作为开源默认配置或交付事实。配置验收应以 `configs/*.example.yaml`、`configs/examples/*.example.yaml` 和 `deploy/config.production.example.yaml` 为准。

## 结论

当前工作树已经完成入口收敛和插件系统移除的本地证据闭环：

- 进程入口统一到 `cmd/console`。
- Go module path 已收敛到中性开源路径。
- 插件运行时、协议、示例和前端插件 API 路径不再参与可交付代码。
- 未来业务扩展路径固定为 `internal/modules/<module>`、route contract、前端路由、i18n 和测试共同扩展。
- 文档中保留插件路径只用于说明“已删除”和“禁止恢复”，不表示仍存在运行期插件系统。

## 后续检查

发布或创建 PR 前建议复跑：

```powershell
go list -mod=readonly ./...
go test ./internal/app/... ./internal/config ./internal/transport/http ./types/... -count=1 -mod=readonly
git diff --check
```

如具备 Docker 环境，还必须补充：

```powershell
docker build -t console-platform:local .
```
