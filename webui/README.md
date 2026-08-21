# Admin WebUI

`webui/` 是当前根 Go 工程质量链已接入的 React/Vite Admin WebUI。仓库构建布局由根 `.scaffold/layout.json` 声明：模块 WebUI facet、宿主源码、registry 输出和生成物路径都从该清单读取；Binding 中的 `SourcePath` 只写所属 facet 内的相对路径。

## 本地开发

从仓库根目录先启动后端并提供 setup token，再在第二个终端执行：

```powershell
corepack enable
corepack install --global pnpm@10.22.0
Set-Location webui
pnpm install
pnpm generate:check
pnpm dev
```

默认地址为 `https://127.0.0.1:5173`。需要调整开发端口或代理时，复制 `webui/.env.example` 为 `.env.local`，使用 `WEBUI_DEV_HOST`、`WEBUI_DEV_PORT`、`WEBUI_API_TARGET` 和 `WEBUI_MANAGEMENT_TARGET`；Vite 与 Playwright 共用这组受控配置。IAM 已提供 setup/login/security/users/roles/permissions 页面与持久化，完整步骤见[WebUI 本地启动指南](../docs/getting-started/webui.md)。

## 静态质量

根目录统一入口：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/Verify-WebUI.ps1
```

Linux 使用 `bash scripts/verify-webui.sh`。质量链覆盖生成检查、冻结安装、lint、模块 lint、typecheck、test 和 build；它不启动后端，不替代 Playwright E2E、视觉验收或生产部署验证。

## 边界

- 业务 WebUI 页面由对应 `internal/module/<id>` 持有；宿主 SDK 和跨模块资源规则由 WebUI 开发文档与 lint 约束。
- WebUI 当前已证明本地 Vite 开发和静态构建；Docker/release 尚未证明会打包或托管 `webui/dist`。
- 新增页面、模块、路由、生成契约或运行方式时，必须更新对应 authority 并提交 `documentation-impact.yaml`。
