# 模块化扩展与插件移除二次审计：2026-06-23

本文记录第七阶段“业务模块化机制与插件系统移除”的二次收口。结论以当前代码、目录、配置示例、测试约束和文档为依据；被忽略的本地派生配置不作为开源交付事实。

## 审计范围

- `internal/modules`
- `internal/app/initapp`
- `internal/transport/http/contracts.go`
- `internal/transport/http/router.go`
- `internal/import_boundary_test.go`
- `web/app/app/lib/api`
- `web/app/app/routes`
- `docs/extension/module-blueprint.md`
- `docs/extension/adding-modules.md`
- `configs/*.example.yaml`
- `configs/examples/*.example.yaml`
- `deploy/config.production.example.yaml`
- `deploy/docker-compose.production.example.yml`

## 真实状态

当前平台不再存在运行期插件系统。业务扩展路线已经收敛为显式模块接入：

| 位置 | 当前职责 |
| --- | --- |
| `internal/modules/<module>` | 模块业务代码，按 `model`、`service`、`repository`、`handler` 分层 |
| `internal/app/initapp` | 应用层显式装配模块仓储、服务、处理器和基础设施适配 |
| `internal/transport/http/contracts.go` | 主系统 API、权限、访问级别和 OpenAPI 元数据的事实来源 |
| `internal/transport/http/router.go` | 注册真实 HTTP 路由并同步 route contract |
| `web/app/app/lib/api` | 前端 endpoint 表、请求封装和共享类型 |
| `web/app/app/routes`、`web/app/app/features` | 后台页面、公开产品线入口和可复用交互 |
| `docs/extension/module-blueprint.md` | 新模块后端、前端、权限、i18n、测试和文档接入蓝图 |

`Announcements` 是当前端到端业务示例模块，证明新增模块可以通过后端模块、route contract、前端 API client、后台页面、公开入口、i18n 和测试形成闭环。

## 发现的问题

| 类型 | 问题 | 处理 |
| --- | --- | --- |
| 可维护性问题 | 已有边界测试能约束运行时代码不恢复插件包，但没有覆盖插件协议文档、前端插件入口和插件配置示例这类交付面残留。 | 新增 Go 边界测试，固定已删除插件交付目录不得恢复。 |
| 开源可复用性问题 | 配置示例和部署示例如果重新出现插件配置块，会误导新开发者继续按插件系统扩展。 | 新增 Go 边界测试，扫描受控配置示例和部署示例不得暴露插件配置。 |
| 本地环境差异 | `configs/config.local.yaml` 是 `.gitignore` 忽略且未跟踪的本地派生配置，可能包含个人历史字段。 | 不修改本地配置；交付验收以受控 example 配置和 deploy 示例为准。 |

## 本轮变更

- 在 `internal/import_boundary_test.go` 中新增 `TestRemovedPluginDeliveryArtifactsAreNotPresent`。
  - 防止 `docs/api/plugin-protocol`、`docs/modules/plugins.md`、`web/app/app/routes/admin/plugins.tsx`、`web/app/app/lib/api/plugins.ts` 等旧插件交付入口恢复。
- 在 `internal/import_boundary_test.go` 中新增 `TestTrackedConfigExamplesDoNotExposePluginSettings`。
  - 扫描 `.env.example`、`configs/config.example.yaml`、`configs/examples/*.yaml`、`deploy/config.production.example.yaml` 和 `deploy/docker-compose.production.example.yml`。
  - 防止受控配置示例重新出现 `plugins:`、`plugin-api`、`/api/v1/plugins` 等插件配置或路径。
- 在根 `AGENTS.md` 插件系统规则中补充：受控配置示例、部署示例和前端生产 API 不得恢复插件配置或插件 API 路径。

## 架构影响

本轮不改变运行时代码和模块装配行为，只把插件系统移除结果固化为可执行约束。后续新增业务能力仍必须走显式模块化链路：

1. 后端新增 `internal/modules/<module>`。
2. 应用层在 `internal/app/initapp` 显式装配。
3. HTTP route contract 声明 API、权限和 OpenAPI 元数据。
4. System API catalog 和权限同步从 route contract 派生。
5. 前端通过 `web/app/app/lib/api` endpoint 表和 API client 接入。
6. 用户可见文案进入 i18n，模块说明进入 README 和 `docs/modules`。
7. 通过 Go、TypeScript、i18n、Playwright 或聚焦测试验证闭环。

平台不保留运行期动态插件发现、插件协议兼容层或插件配置迁移层。这个取舍让新增能力更容易被代码审查、权限同步、OpenAPI 和前端测试覆盖。

## 验证命令

```powershell
go test ./internal -run "TestRemovedPluginDeliveryArtifactsAreNotPresent|TestTrackedConfigExamplesDoNotExposePluginSettings|TestPluginRuntimePackagesAreNotPresent" -count=1 -mod=readonly
```

结果：通过。

建议发布前继续执行：

```powershell
rg -n -i "internal/plugin|pkg/plugin|pkg/pluginapi|docs/api/plugin-protocol|/api/v1/plugins|/plugin-api" `
  cmd internal pkg types web/app/app web/app/tests configs deploy .github scripts script Dockerfile go.mod `
  --glob "!**/*.md" `
  --glob "!**/*_test.go" `
  --glob "!configs/config.local.yaml" `
  --glob "!web/app/build/**" `
  --glob "!web/app/node_modules/**" `
  --glob "!tmp/**" `
  --glob "!build/**"
```

结果应无输出。文档和测试中保留“禁止恢复插件路径”的说明属于治理约束，不表示仍存在运行时插件系统。

## 后续规则

- 新增业务功能不得新增插件配置、插件 API、插件协议或远程插件示例。
- 新增模块不得通过目录扫描、反射注册或隐藏 fallback 绕过 `internal/app/initapp` 显式装配。
- 新增模块的 API 权限必须进入 route contract，不能由前端路由、路径前缀或文档二次推断。
- 受控配置示例和部署示例只描述当前有效能力，不保留已删除插件系统的兼容字段。
- 本地 ignored 配置只用于个人开发，不得作为 README、部署文档或验收结论的依据。
