# 项目范围与当前状态

本文是仓库边界的当前 authority。它描述代码和交付链已经证明的状态，不把目录存在、历史记录或目标设计当成已集成能力。

## 当前目标语境

本仓库当前处于第一个正式版本发布前的工程成型期，目标产品是一套 copy-owned source scaffold：使用者复制经过验证的完整源码基线，迁移项目身份，并在自己的 Git 历史中继续开发。当前 `origin/main` 只是共享开发基线；仓库尚无正式 tag/release，也没有已确认的外部生产数据库、API 或配置兼容对象。

该语境产生以下当前约束：

| 主题 | 当前结论 |
| --- | --- |
| 首发前演进 | 模块 owner、schema、命名或装配错误应直接收敛为干净单轨 baseline，不为未发布历史保留 alias、旧入口或自动升级链。 |
| 历史证据 | Git 与 `docs/changes/` 保留为什么变化；当前源码、migration 和主题文档只表达首发目标状态。 |
| 本地运行数据 | `.data/`、本地配置和其它未跟踪运行数据仍属于用户；即使没有正式 release，也不得未经当次确认自动删除、覆盖或迁移。 |
| 兼容冻结点 | 首个经确认的正式 tag/release 冻结首发 migration、API 和配置兼容基线；此后破坏性变化必须重新研究版本与迁移策略。 |
| Todo 定位 | Todo 是默认保留、可完整删除的学习型业务示例，不是底座依赖；保留或移除由明确产品范围决定。 |

若发现正式发布、外部消费者、生产数据库或兼容承诺的新证据，相关任务必须刷新本语境并回到研究阶段，不能继续套用“首发前可重整 baseline”的结论。

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

如果项目阶段、兼容对象、实现范围、构建入口、前端集成方式、产物身份或生产交付方式发生变化，必须更新本文并提交文档影响记录；如果目标超出本次已确认范围，应先创建新的研究/计划变更。
