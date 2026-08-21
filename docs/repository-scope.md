# 项目范围与当前状态

本文是仓库边界的当前 authority。它描述代码和交付链已经证明的状态，不把目录存在、历史记录或目标设计当成已集成能力。

## 当前状态矩阵

| 范围 | 当前状态 | 当前证据 | 不应声称 |
| --- | --- | --- | --- |
| 根 Go 工程 | 当前 root build、Go quality、CLI、API、migration 和 release 配置的事实范围 | `go.mod`、`cmd/app`、`internal/composition`、`.github/workflows` | 不应把其它前端或历史目录自动视为同一运行时 |
| `webui/` | 当前 Admin WebUI；生成、lint、typecheck、test、build 已接入质量链；本地 Vite 启动可用 | `webui/package.json`、`scripts/Verify-WebUI.ps1`、`scripts/verify-webui.sh` | 不应声称 Docker/release 已托管 `webui/dist` |
| `frontend/` | 受版本管理的独立 Nuxt/Vue 前端，但当前未接入根 Go build、quality、Docker 或 release；其旧 README 中的 backend 路径和检查脚本已不属于当前事实 | 当前目录、根 workflow、Dockerfile、release 配置 | 不应声称已经与当前 root 后端集成；集成或退役需另立任务 |
| `old-backend/` | 按文档治理范围明确排除，不属于当前 authority、链接图或 docs guard 扫描 | 本文的范围声明与 `docs/documentation.yaml` | 本任务不审计、修改、迁移或删除其内部内容 |
| Git/产物身份 | Git remote 为 `rin721/community-go`；Go module、README 主身份、Docker 与 `.scaffold/identity.yaml` 仍是 `go-scaffold-template` | `git remote`、`go.mod`、`.scaffold/identity.yaml` | 不应把身份迁移描述为已完成；迁移需单独决策和验证 |

## 当前运行边界

- 本地后端启动和 WebUI Vite 启动路径见[五分钟本地启动](../README.md#五分钟本地启动)与[全栈 WebUI 本地启动](../README.md#全栈-webui-本地启动)。
- WebUI 质量门禁验证静态生成、lint、类型、测试和 build，不启动后端，不代表浏览器 E2E 或生产静态托管已经完成。
- API、CLI、management、数据库迁移和外部资源的当前行为必须回到对应主题文档与代码入口确认。
- `docs/changes/` 和 `docs/research/` 是证据层；它们不替代本文或其它当前主题 authority。
- 导入基线和任务来源见[脚手架基线来源](scaffold-baseline.md)，不作为当前实现说明；独立前端局部状态见[`frontend/README.md`](../frontend/README.md)。

## 变更规则

如果实现范围、构建入口、前端集成方式、产物身份或生产交付方式发生变化，必须更新本文并提交文档影响记录；如果目标超出本次已确认范围，应先创建新的研究/计划变更。
