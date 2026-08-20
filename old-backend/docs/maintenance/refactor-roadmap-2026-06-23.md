# 开源平台化重构任务计划：2026-06-23

本文是当前开源后台管理 / 控制台平台化重构的总任务计划入口。它用于回答“当前任务计划在哪里、做到哪一步、下一步从哪里继续”。具体代码事实、测试输出和阶段证据仍以对应审计文档、脚本输出和当前工作树为准。

## 计划状态

| 项目 | 当前结论 |
| --- | --- |
| 总目标 | 将当前仓库整理为可运行、可扩展、可二次开发的开源后台管理 / 控制台平台 |
| 当前阶段 | 第七阶段到第十阶段交叉收敛：插件系统移除、模块化扩展、防回潮检查、发布前证据和最终缺口审计 |
| 已完成主体 | 入口命名、插件系统删除、模块化扩展文档、分层文档、关键目录 README、文档链接检查、Announcements 示例模块、本地运行烟测、视觉 QA、本机工具检查、发布前 gate 脚本、main CI Docker build 与容器 smoke artifact 校验 |
| 未完成主体 | 生产迁移和备份证据、密钥注入、回滚演练、目标环境发布 smoke、生产级视觉抽查 |
| 当前不能宣告生产发布完成的原因 | main CI 已补齐容器构建与运行证据，但生产发布证据、目标环境 smoke、数据库迁移、备份、密钥和回滚仍缺失，详见 [最终验收差距审计](final-acceptance-gap-audit-2026-06-23.md) |

## 阶段计划

| 阶段 | 范围 | 当前状态 | 主要证据 | 下一步 |
| --- | --- | --- | --- | --- |
| 1. 项目外层结构与工程入口 | 进程入口、仓库命名、构建入口、部署脚本 | 已完成本地收敛 | [入口与品牌收敛审计](entry-brand-convergence-audit-2026-06-23.md)、`scripts/check-entry-brand-convergence.ps1` | 拆 PR 时作为第一组独立复核 |
| 2. 文档、README、AGENTS 与开发规范 | 根 README、工程文档入口、长期 Agent 规则、关键目录 README | 已完成主体，持续随代码更新 | `README.md`、`AGENTS.md`、[工程文档](../README.md)、[最终开源可用性审计](final-open-source-readiness-audit-2026-06-23.md) | 新增目录或模块时继续补 README |
| 3. 构建、配置、环境变量、脚本与启动链路 | 配置示例、部署脚本、CI、发布包、本地 smoke | 本地链路已证明；main CI 已证明 Docker build 与容器 smoke；本机 Docker 仍缺失 | [构建配置与启动链路审计](build-config-startup-audit-2026-06-23.md)、[Docker 静态链路证明](../testing/docker-static-proof-2026-06-23.md)、[CI Docker 证据校验脚本审计](ci-docker-evidence-check-audit-2026-06-23.md)、`scripts/runtime-smoke.ps1` | 发布目标环境继续记录镜像摘要、目标地址 smoke 和资源限制 |
| 4. 后端架构分层与核心基础能力 | `internal/app`、`internal/modules`、`pkg`、`types`、边界测试 | 已完成主体 | [分层架构](../architecture/layers.md)、[后端分层边界审计](backend-boundary-audit-2026-06-23.md)、`internal/import_boundary_test.go` | 新增模块继续按边界测试约束 |
| 5. 前端架构分层、页面结构与交互闭环 | React 路由、API client、i18n、组件命名、视觉 QA | 已完成当前 smoke 范围 | [前端分层与交互边界审计](frontend-boundary-audit-2026-06-23.md)、[全量视觉 QA 基线](../testing/visual-qa-full-2026-06-23.md) | 发布候选用目标环境刷新截图 |
| 6. 权限、认证、菜单、用户、角色、审计等后台核心闭环 | IAM、System、权限矩阵、route contract、后台菜单、通知投递队列运维入口 | 已形成最小闭环 | [后台核心权限闭环审计](auth-permission-core-audit-2026-06-23.md)、[权限矩阵](../modules/permission-matrix.md)、[通知队列视觉 QA](../testing/visual-qa-notification-outbox-2026-06-23.md) | 完整通知/消息中心、消息模板、订阅偏好和多渠道编排等高阶能力进入 backlog |
| 7. 业务模块化机制与插件系统移除 | 删除插件运行时、协议、配置、前端入口；统一模块扩展 | 正在收敛发布前证据 | [插件系统移除收敛审计](plugin-removal-convergence-audit-2026-06-23.md)、[模块接入蓝图](../extension/module-blueprint.md)、`scripts/check-plugin-removal.ps1` | 保持第二组 PR 边界清晰，复跑检查 |
| 8. i18n、注释、类型定义、错误处理、结果封装 | locale、全局 types、错误和结果契约 | 已完成主体 | [i18n、类型、错误与结果封装审计](i18n-types-errors-audit-2026-06-23.md)、[错误与结果契约](../architecture/error-result-contracts.md) | 新增工具库必须补错误返回测试 |
| 9. 测试、可观测性、部署、示例数据与演示环境 | 测试矩阵、运行烟测、发布证据、Docker smoke、视觉 QA | 本地证据和 main CI Docker 证据已较完整，生产级证据缺失 | [测试矩阵](../testing/test-matrix.md)、[发布前检查](../release/preflight-checklist.md)、[发布前验收记录](../release/preflight-2026-06-23.md) | 目标环境补迁移、备份、密钥、回滚和真实部署 smoke |
| 10. 最终开源可用性审查 | 开源可用性、剩余风险、PR 拆分 | 已完成本地审计、干净提交和 main CI 证据，未宣告生产发布关闭 | [开源可用性审查](open-source-readiness.md)、[最终验收差距审计](final-acceptance-gap-audit-2026-06-23.md)、[工作区收敛审计](worktree-convergence-2026-06-23.md) | 发布候选补目标环境证据并保留最新 CI 结果 |

## 当前优先级

1. 保持插件系统移除、任务计划入口、文档链接、本机工具和 Agent skill 元数据边界可重复验证：运行 `scripts/check-local-tooling.ps1`、`scripts/check-doc-links.ps1`、`scripts/check-plugin-removal.ps1`、`scripts/check-agent-skills.ps1`、`scripts/check-open-source-readiness.ps1` 和 `scripts/release-preflight.ps1`。
2. 本地已形成干净提交边界；对外审查或合并前继续按 [PR 拆分计划](pr-split-plan-2026-06-23.md) 组织 PR 或审查说明，避免一个 PR 同时承载入口命名、插件删除、前端、示例模块和发布证据。
3. 使用 main CI run `28029100140` 和 `scripts/check-ci-docker-evidence.ps1` 作为当前提交的 Docker build 与容器 smoke 证据；若发布目标环境重新构建镜像，则继续运行 `scripts/docker-smoke.ps1` 或 `scripts/docker-smoke.sh` 留证。
4. 发布候选时复制 [发布证据模板](../release/release-evidence-template.md)，补生产迁移、备份、密钥、回滚、目标地址 smoke 和观察窗口。

## 计划和证据关系

| 文档 | 作用 |
| --- | --- |
| 本文 | 总任务计划入口，说明阶段、当前状态和下一步 |
| [PR 拆分计划](pr-split-plan-2026-06-23.md) | 把平台化重构成果拆成可审查提交或 PR |
| [最终验收差距审计](final-acceptance-gap-audit-2026-06-23.md) | 逐项说明哪些目标已证明、部分证明或未证明 |
| [开源可用性审查](open-source-readiness.md) | 汇总当前开源平台可用性结论和证据 |
| [工作区收敛审计](worktree-convergence-2026-06-23.md) | 记录当前变更规模和提交前收敛要求 |

## 执行约束

- 本计划不是替代代码事实的“愿望清单”；每一项完成状态必须能被文件、命令输出、测试、截图或目标环境记录证明。
- 文档中允许记录已删除插件系统和历史命名作为审计事实，但生产代码、配置示例、前端入口和发布脚本不得恢复旧设计。
- 目标未全部闭环前，不应把当前工作树标记为生产发布完成；当前 main 已有 CI Docker 证据，但仍需要生产发布、目标环境 smoke、迁移、备份、密钥、回滚和观察窗口补证。
