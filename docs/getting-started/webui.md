# WebUI 本地启动指南

本文说明如何在本地同时启动 Go Service 与独立 `webui/`。后端负责业务 HTTP、management、WebUI manifest 和本地 Session；Vite 只提供浏览器页面，并把请求代理到后端。

## 前置条件

- 已安装仓库要求的 Go、Node.js 与 pnpm；
- 以下命令从仓库根目录开始执行；
- 本地端口 `8080`、`9090` 和 Vite 选择的端口可用；
- 首次设置使用高熵 Setup Token，不能把真实值写入配置样例、源码或提交记录。

## 1. 首次初始化

只在尚无 `config.yaml` 时生成默认配置：

```powershell
go run ./cmd/app config init
```

随后执行数据库前滚迁移。WebUI 本地用户和 Session 表也由当前 migration 集合创建：

```powershell
go run ./cmd/app db migrate up
```

已有 `config.yaml` 时不要重复执行 `config init`，也不要使用 `--force` 覆盖本地配置。

## 2. 启动后端

在第一个 PowerShell 终端中设置仅供首次创建用户使用的高熵 Token，然后启动 Service：

```powershell
$env:APP_AUTH__LOCAL__SETUPTOKEN = '<从密码管理器取得的高熵随机值>'
go run ./cmd/app
```

环境变量必须设置在启动后端的同一终端。日志出现 `application generation started` 和 `application ready` 后，可在另一个终端检查：

```powershell
Invoke-RestMethod http://127.0.0.1:9090/readyz
```

默认业务 HTTP 地址是 `127.0.0.1:8080`，management 地址是 `127.0.0.1:9090`。后端终端需要持续运行。

## 3. 启动 WebUI

在第二个 PowerShell 终端中执行：

```powershell
Set-Location webui
pnpm install
pnpm generate:check
pnpm dev
```

`pnpm install` 只需在首次拉取或依赖锁变化后执行。Vite 会打印浏览器访问地址；必须使用它输出的 `https://` 地址，不能改用 HTTP，否则带 `Secure` 属性的 Session Cookie 不会生效。端口被占用时 Vite 可能选择其他端口，因此不要硬编码端口。

当前实现的生成命令仍为 `admin generate`，已经封装在 `pnpm generate` 与 `pnpm generate:check` 中；043 完成单轨命名迁移后再同步为 `webui` 命令。日常启动只需要执行 clean check，不要手工编辑 `src/generated/admin-registry.ts`。

## 4. 首次设置与登录

首次运行时，在 Vite 地址后访问 `/setup`，填写：

- 第一个终端设置的同一 Setup Token；
- 本地用户名；
- 15 至 128 个字符的密码。

首次创建成功后浏览器会获得服务端 Session 并进入 `/dashboard`。设置入口随后关闭，之后从 `/login` 登录；Setup Token 不再用于登录。完成首次设置后可以停止后端、清除该终端环境变量，再重新启动：

```powershell
Remove-Item Env:APP_AUTH__LOCAL__SETUPTOKEN
```

停止两个开发进程都使用 `Ctrl+C`。

## 5. 常见问题

| 现象 | 处理方式 |
| --- | --- |
| 页面一直显示 manifest 或装配错误 | 先确认后端已 ready，再检查 Vite 终端的 `/api/v1` 代理请求。 |
| Setup Token 返回 `invalid_credentials` | 确认环境变量与后端在同一终端启动，并使用完全一致的 Token。 |
| `setup_closed` | 数据库已经存在本地用户；使用 `/login`，忘记密码时运行当前 `admin reset-password` CLI。 |
| 登录成功但 Cookie 不生效 | 必须打开 Vite 输出的 HTTPS 地址，不要使用 HTTP。 |
| `admin registry is stale` | 在 `webui/` 执行 `pnpm generate`，审查生成差异后再运行 `pnpm generate:check`。 |
| management 卡片请求失败 | 检查 `http://127.0.0.1:9090/readyz`，并确认 Vite `/management` 代理没有被本地代理软件拦截。 |

WebUI 的模块 Binding、Session、CSRF 和 registry 开发边界见 [WebUI 开发指南](../development/admin-webui.md)。
