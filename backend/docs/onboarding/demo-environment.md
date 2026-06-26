# 本地演示环境与示例数据

本文档说明如何在本地获得一个可演示、可验证、不会污染仓库事实来源的后台控制台环境。

## 原则

- 仓库不提供默认管理员账号、默认密码或长期可用的演示 Token。
- 仓库不内置虚构业务数据；当前内置数据只服务平台运行，例如字典、参数、菜单、API catalog 和权限目录。
- 首次管理员必须通过 `/setup`、`console init` 或 `iam bootstrap-admin` 显式创建。
- 本地演示数据应放在 `data/`、`tmp/` 或本地数据库中，不得提交到源码目录。
- 产品名称、产品码、认证 issuer、存储 bucket 和公开 URL 继续从配置读取，不写死到页面或 seed 中。

## 最小本地演示流程

1. 检查本机工具链。

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
```

该脚本只读，不会启动服务或写配置；如果 Docker、Bash、GitHub CLI 等外部补证工具缺失，应记录为发布证据缺口，不要把容器或 CI artifact 验证写成已完成。

2. 构建前端静态产物，或启动前端开发服务。

```powershell
pnpm --dir web/app build
```

3. 使用示例配置启动后端。示例配置会使用 SQLite、local cache 和 local storage。

```powershell
go run ./cmd/console server --config=configs/config.example.yaml
```

4. 打开 `http://127.0.0.1:9999/setup` 完成初始化，或使用 CLI 创建管理员：

```powershell
Copy-Item configs/config.example.yaml configs/config.yaml
"change-this-local-password" | go run ./cmd/console iam bootstrap-admin --config=configs/config.yaml --org-code=local --org-name="Local Workspace" --username=admin --email=admin@example.com --password-stdin
```

5. 打开 `http://127.0.0.1:9999/admin` 登录后台。

## 自动烟测脚本

需要快速证明后端入口、临时 SQLite、OpenAPI 和 React WebUI 静态托管都能跑通时，可以使用本地烟测脚本：

```powershell
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
```

脚本只写入 `tmp/ai/runtime-smoke`，不会修改 `configs/config.yaml`、`configs/config.local.yaml` 或 `data/`。如果要使用自定义端口或目录：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1 -Port 29999 -WorkDir tmp/ai/demo-smoke
```

## 内置默认数据

`system.seed_defaults_on_start=true` 时，System 模块会幂等补齐平台运行所需数据：

| 类型 | 内容 |
| --- | --- |
| 字典 | `system.status`、`http.method`、`operation.result` |
| 参数 | `admin.title`、`admin.home_path` |

这些不是业务示例数据，也不是生产配置事实来源。它们只用于让后台基础页面具备可读的字典和参数项。已有参数被人工修改后，seed 不会覆盖用户值。

## 不提供默认演示账号的原因

默认账号和默认密码会降低开源项目复用安全性，也容易被误带入生产环境。需要演示登录时，必须在本地或临时环境显式创建账号，并在演示结束后清理本地数据库。

## 演示数据扩展建议

如果后续需要可复用的业务演示，应新增独立模块级示例，而不是把样例写进平台 seed：

- 示例数据脚本放在 `scripts` 或对应模块的 `docs` 中，并标记为本地/演示专用。
- 示例数据必须可重复执行、可清理，并且不得覆盖用户已有数据。
- 示例数据不得包含真实密钥、真实邮箱凭证、真实外部服务地址或不可复用品牌文案。
- 示例模块的 API、权限、菜单和前端页面必须按模块开发规范接入显式模块化链路。

## 快速清理

本地默认 SQLite 和上传文件位于 `data/`，临时烟测建议使用 `tmp/ai/startup-smoke`。清理前先确认没有需要保留的数据：

```powershell
Remove-Item -Recurse -Force .\tmp\ai\startup-smoke
```

如需清理 `data/`，必须确认它只是本地演示数据；不要把该命令用于共享或生产环境。
