# 项目概览

当前项目是一个通用后台管理 / 控制台平台底座。它不是单一后台模板，也不是只提供目录结构的脚手架；主系统可以直接运行，并提供账号权限、组织租户、系统配置、审计日志、媒体、版本、API catalog、初始化向导和 React 后台控制台。

## 产品形态

- 主平台：统一承载身份、权限、组织、配置、审计、媒体、版本、系统管理和基础运营能力。
- 业务产品线：未来通过新增模块扩展公开前台、业务后台、领域模型和业务 API；当前 `announcements` 已作为最小端到端业务模块示例，并提供公开只读公告入口。
- 前端体验：`web/app` 提供当前公开站点、`/setup` 和 `/admin`。

## 扩展方式

扩展通过模块化路线落地：

1. 在 `internal/modules/<module>` 放置 `model`、`service`、`repository`、`handler`。
2. 在 `internal/app/initapp` 装配模块依赖。
3. 在 `internal/transport/http/contracts.go` 声明主系统 HTTP API。
4. 在 `web/app` 增加对应 API client、路由和 i18n。

当前可参考 `internal/modules/announcements`、`/admin/announcements` 与 `/announcements`，它演示了从后端模块、权限、公开只读契约、OpenAPI 到 React 后台/公开页面和 Playwright smoke 的完整接入链路。

## 本地默认

- 后端：`go run ./cmd/console server`，监听 `127.0.0.1:9999`。
- 前端：`pnpm --dir web/app dev --host 127.0.0.1 --port 3002`。
- 数据：默认 SQLite 位于 `data/`。
- 配置：示例来自 `configs/config.example.yaml`；本地私有配置不作为文档事实来源。
