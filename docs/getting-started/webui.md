# WebUI 本地启动指南

本文说明 WebUI 的两种运行模式与数据源环境显式声明。后端负责业务 HTTP、management、WebUI manifest 和本地 Session；由 `config.yaml` 的 `webui.hosting.enabled` 选择托管方式（默认 `true`）：

- **模式 B（默认）：Go 服务单进程托管**——Go Service 在业务 listener（默认 8080）同时提供页面与 API；
- **模式 A：前后端分离**——Vite 只提供浏览器页面，并把请求代理到后端，适合 HMR 联调。

WebUI 侧通过 `VITE_WEBUI_DATA_SOURCE` **显式声明**数据源环境（默认 `server-hosted`，对应模式 B 托管产物；`separated` 用于模式 A 开发声明；`mock` 用于无后端预览/演示，整个 WebUI 骨架与全部模块数据使用本地 mock，见[数据源环境声明与 mock 预览](#数据源环境声明与-mock-预览)）。

## 0. 前置条件

- 已安装仓库要求的 Go、Node.js 与 pnpm（模式 B 首次自动构建需要；产物已存在时不需要）；
- 以下命令从仓库根目录开始执行；
- 模式 A 需要本地端口 `8080`、`9090` 和 Vite 选择的端口可用；
- 首次设置使用高熵 Setup Token，不能把真实值写入配置样例、源码或提交记录。

## 模式 B：Go 服务托管（默认）

```powershell
$env:APP_IAM__LOCAL__SETUPTOKEN = '<从密码管理器取得的高熵随机值>'
go run ./cmd/app config init   # 已有 config.yaml 时跳过
go run ./cmd/app db migrate up # 已有数据库时跳过
go run ./cmd/app
```

development 环境下若 `webui.hosting.dir`（默认 `webui/dist`）不存在，启动前会自动执行一次托管前构建脚本（默认 node：业务模块 registry 生成 -> 依赖安装 -> 构建打包）；日志会打印 `webui hosting assets are missing; running pre-hosting build script` 与 `webui hosting assets are ready`。需要显式重建产物：

```powershell
go run ./cmd/app webui build
```

浏览器访问 `http://127.0.0.1:8080`（页面与 API 同源，深链如 `/dashboard` 回退到 SPA）。`logger.environment: production` 时缺产物会快速失败，镜像构建期必须装配好 `webui/dist`，运行期容器不含 node。

模式 B 下业务 listener 额外挂载与 management listener（9090）同语义的受保护 facade（`/management/{startupz,livez,readyz,build,diagnostics,metrics,metrics-summary}`，GET）：托管 WebUI 的 Ops 页面（`运行状态`、`能力清单`）同源读取真实数据；`/metrics-summary` 为 090 typed 指标投影（key/value/unit/asOf），产品 UI 消费，不再解析 Prometheus 文本。未知子路径保持 JSON 404、不回退 SPA。诊断/metrics 仍要求会话与 `management:read`，缺失时页面按既有失败语义降级。

## 数据源环境声明与 mock 预览

WebUI 通过 `VITE_WEBUI_DATA_SOURCE`（`webui/.env.example` 有默认值与取值说明，复制为 `.env.local` 后覆盖）显式声明数据源环境：

| 声明 | 对应运行方式 | 行为 |
| --- | --- | --- |
| `server-hosted`（默认） | 模式 B（Go 服务托管构建产物） | 同源读取 `/management/*` facade 等真实接口 |
| `separated` | 模式 A（Vite dev + Go Service） | 同源相对路径经 Vite 代理（`/api/v1`→8080、`/management`→9090）读取真实接口 |
| `mock` | 静态预览/演示（无后端） | 整个 WebUI 使用本地 mock 数据：宿主骨架（manifest/session/logout）与全部模块页面数据均由宿主 SDK 传输层切换到本地 mock router，零真实网络请求，页面可完整浏览 |

- 托管产物必须以默认或显式 `server-hosted` 构建；`webui build` 会拒绝 `mock` 声明（mock 演示构建使用普通 `pnpm build` + `.env.local` 设置 `VITE_WEBUI_DATA_SOURCE=mock`）。
- mock 环境的 manifest 由 Go catalog 投影生成（全路由可用），`catalogRevision` 与生成 registry 一致，宿主版本门禁天然通过；每个模块的 mock 数据由模块自有的 `binding/webui/web/mock.ts` 提供，经生成 `webuiMockRegistry` 汇总。
- mock 模式全程显示“模拟环境 / Mock environment”徽标（i18n 双语），所有数据均为本地示例，不代表真实服务状态。
- 非法取值在 dev/Playwright 启动前由 typed 配置解析失败；客户端读取缺失/非法时保守回退默认 `server-hosted`。

## 模式 A：前后端分离（Vite HMR）

把 `config.yaml` 的 `webui.hosting.enabled` 改为 `false`，然后按以下步骤启动两个终端。

## 1. 首次初始化（两种模式共用）

只在尚无 `config.yaml` 时生成默认配置：

```powershell
go run ./cmd/app config init
```

随后执行数据库前滚迁移。当前 Catalog 会分别执行 IAM、Organization、Navigation 与 Todo 的独立 baseline：

```powershell
go run ./cmd/app db migrate up
```

已有 `config.yaml` 时不要重复执行 `config init`，也不要使用 `--force` 覆盖本地配置。

IAM 使用 `iam_schema_migrations` 创建账号、凭据、Session、角色与关系表；Organization 使用 `organization_schema_migrations` 创建部门、岗位与账号组织关系；Navigation 使用 `navigation_schema_migrations` 创建稀疏菜单策略；Todo 继续使用 `todo_schema_migrations`。包含旧 `schema_migrations` 或 `webui_*` 表的数据库会被只读 preflight 拒绝。不要直接删除、覆盖或让 Agent 自动处理现有本地数据；当前项目未发布时可显式选择新的本地数据库建立干净 baseline。

## 2. 启动后端（模式 A）

在第一个 PowerShell 终端中设置仅供首次创建用户使用的高熵 Token，然后启动 Service：

```powershell
$env:APP_IAM__LOCAL__SETUPTOKEN = '<从密码管理器取得的高熵随机值>'
go run ./cmd/app
```

环境变量必须设置在启动后端的同一终端。日志出现 `application generation started` 和 `application ready` 后，可在另一个终端检查：

```powershell
Invoke-RestMethod http://127.0.0.1:9090/readyz
```

默认业务 HTTP 地址是 `127.0.0.1:8080`，management 地址是 `127.0.0.1:9090`。后端终端需要持续运行。

本地 WebUI 的 `http.cors.allowedOrigins` 必须精确包含以下两个固定 Origin，并在修改后重启后端：

```yaml
http:
  cors:
    allowedOrigins:
      - https://localhost:5173
      - https://127.0.0.1:5173
```

CORS 与 IAM Session 的 CSRF Origin 校验共用该列表。不要改成 `*`，生产配置应替换为真实部署 Origin。模式 B（同源访问）不需要在列表中增加自身 Origin，`SameOrigin` 精确比较会自动放行。

## 3. 启动 WebUI（模式 A）

在第二个 PowerShell 终端中执行：

```powershell
Set-Location webui
pnpm install
pnpm generate:check
pnpm dev
```

`pnpm install` 只需在首次拉取或依赖锁变化后执行。默认开发值由 `webui/scripts/project-layout.mjs` 的 typed parser 管理；复制 `webui/.env.example` 为 `.env.local` 后可通过 `WEBUI_DEV_HOST`、`WEBUI_DEV_PORT`、`WEBUI_API_TARGET` 和 `WEBUI_MANAGEMENT_TARGET` 覆盖。Vite 与 Playwright 读取同一组值，端口被占用时会明确启动失败，避免静默切换到未被 Origin allowlist 授权的端口。必须使用它输出的 `https://` 地址，不能改用 HTTP，否则带 `Secure` 属性的 Session Cookie 不会生效。

Vite 使用项目配置的本地自签名证书。浏览器首次访问会提示证书不受信任；确认访问的是终端打印的本机 `127.0.0.1`/`localhost` 地址后，选择继续访问。证书只用于本地开发，不用于生产部署。

生成命令为 `webui generate`，已经封装在 `pnpm generate` 与 `pnpm generate:check` 中。日常启动只需要执行 clean check，不要手工编辑 `src/generated/webui-registry.ts`。

## 4. 首次设置与登录（两种模式共用）

首次运行时，在页面地址（模式 A 为 Vite 地址、模式 B 为 `http://127.0.0.1:8080`）后访问 `/setup`，填写：

- 第一个终端设置的同一 Setup Token；
- 3 至 64 位 ASCII 用户名（字母或数字开头，可使用 `._-`）；
- 显示名称；
- 15 至 128 个字符的密码。

首次创建成功后浏览器会获得服务端 Session 并进入 `/dashboard`。设置入口随后关闭，之后从 `/login` 登录；Setup Token 不再用于登录。完成首次设置后可以停止后端、清除该终端环境变量，再重新启动：

```powershell
Remove-Item Env:APP_IAM__LOCAL__SETUPTOKEN
```

拥有对应权限的 owner 可访问 `/admin/departments`、`/admin/positions` 和 `/admin/account-organization`。部门是最大八层的无环树，岗位是平面目录；被有效子部门或账号关系引用的条目不能归档。组织分配与 IAM 创建账号是两个独立用例，不提供跨模块原子操作。

拥有 `navigation:menu:read/write` 的 owner 可访问 `/admin/menus`。页面只修改代码已注册菜单的启停、父级和排序；保存会刷新当前 Manifest。禁用菜单不会删除 Route、Entry 或改变 Auth decision。

模式 A 停止两个开发进程都使用 `Ctrl+C`；模式 B 停止单个 Service 进程即可。

Session Cookie 带 `Secure` 属性：模式 B 的纯 HTTP 只对 loopback（localhost/127.0.0.1）有效（浏览器将 loopback 视为潜在可信来源）；非 loopback 纯 HTTP 部署无法保全 Session，必须使用 TLS 终结的反向代理。

## 5. 常见问题

| 现象 | 处理方式 |
| --- | --- |
| 启动失败提示 `webui hosting assets are unavailable` | 执行 `go run ./cmd/app webui build` 装配产物，或检查 `webui.hosting.dir`；production 环境必须在镜像/部署期预装产物。 |
| 非 loopback 纯 HTTP 页面登录后 Cookie 不生效 | 模式 B 使用纯 HTTP 时仅支持 loopback；对外部署必须由 TLS 终结的反向代理承载。 |
| 页面一直显示 manifest 或装配错误 | 先确认后端已 ready，再检查 Vite 终端的 `/api/v1` 代理请求。 |
| Setup Token 返回 `invalid_credentials` | 确认环境变量与后端在同一终端启动，并使用完全一致的 Token。 |
| `invalid_request` | 检查用户名为 3 至 64 位受控 ASCII、显示名称非空、密码为 15 至 128 个 Unicode 字符。 |
| `password_length_invalid` | 密码必须为 15 至 128 个字符；页面约束只用于即时提示，最终以后端校验为准。 |
| `cors_origin_denied` | 在 `http.cors.allowedOrigins` 中加入实际 Vite HTTPS Origin并重启后端；本地默认只允许 5173。 |
| `origin_rejected` | 确认 IAM 使用的同一候选配置已经包含 Vite Origin，并确认没有连接到未重启的旧后端。 |
| `setup_closed` | 数据库已经存在本地账号；使用 `/login`，忘记密码时运行 `iam reset-password` CLI。 |
| 浏览器提示证书不受信任 | 确认地址是 Vite 打印的本机地址后继续访问；不要把该开发证书用于生产。 |
| 登录成功但 Cookie 不生效 | 必须打开 Vite 输出的 HTTPS 地址，不要使用 HTTP，并确认浏览器已接受本地证书。 |
| `webui registry is stale` | 在 `webui/` 执行 `pnpm generate`，审查生成差异后再运行 `pnpm generate:check`。 |
| management 卡片请求失败 | 模式 B 检查 `http://127.0.0.1:8080/management/readyz`（facade 同源）；模式 A 检查 `http://127.0.0.1:9090/readyz` 与 Vite `/management` 代理；同时确认 `VITE_WEBUI_DATA_SOURCE` 声明与实际运行方式一致（声明 `mock` 时全部请求走本地 mock，不触达后端）。 |

WebUI 的模块 Binding、IAM Session、CSRF 和 registry 开发边界见 [WebUI 开发指南](../development/webui.md)。
