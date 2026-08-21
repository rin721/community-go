# 048 实施任务清单

## 1. 当前状态

- 研究门禁：已通过（R001、R002）。
- 计划状态：纯文档设计已完成，非文档实施待确认。
- 实施授权：无。
- 当前代码事实：`784bacf` 仍使用 Go Binding/SourcePath codegen；本任务没有修改其行为。
- Git 边界：计划文档可按纯文档例外提交；不 push。

## 2. 研究与计划

| ID | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- |
| RES-001 | 审计当前 Binding/Composition/codegen/Router/host/CSS 耦合 | R001 区分合理装配与跨边界耦合 | 已完成 |
| RES-002 | 比较集中前端、静态全栈模块与运行时微前端 | R002 给出适用性、官方能力与拒绝理由 | 已完成 |
| PLAN-001 | 形成 requirements/design/tasks 并停止 047 未完成路线 | 目标、边界、迁移、风险、门禁和后续业务增量明确 | 已完成 |

## 3. 待确认基础重构

以下任务必须在用户确认 048 计划后实施。

### Checkpoint A：边界与平台契约

| ID | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| ARC-001 | 用户确认 | 建立 WebModuleDefinition 与静态 application profile | profile 是唯一汇总点；无扫描、side effect registry 或业务逻辑 | 待确认 |
| ARC-002 | ARC-001 | 建立 platform/module import 门禁 | platform 零业务 import、module 无互相 import、public barrel 收敛 | 待确认 |
| ROUTER-001 | ARC-001 | 实现 definition validation 与 RouteObject 编译 | duplicate/path/parent/locale/default 在 Router 创建前失败；lazy/error boundary 生效 | 待确认 |
| STYLE-001 | ARC-002 | 建立 CSS Modules 与全局样式门禁 | global CSS 只含 token/reset/platform；业务 selector 被拒绝 | 待确认 |
| HOST-001 | ARC-001 | 收敛 HostRuntime/identity/access 契约 | platform 不再公开 WebUISession/Auth DTO；typed identity port 可替换 | 待确认 |

### Checkpoint B：Auth/Ops 前端迁移

| ID | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| ACCOUNT-WEB-001 | HOST-001, STYLE-001 | 把现有 Auth web facet 迁到 `webui/src/module/account` | setup/login/session/locale/API/style/test 模块自有；真实行为不变 | 待确认 |
| ACCOUNT-WEB-002 | ACCOUNT-WEB-001 | 由 account 注入 identity port | Shell 登录态/退出只使用 Principal 与 port；Session DTO 不进入 platform | 待确认 |
| OPS-WEB-001 | ROUTER-001, STYLE-001 | 把现有 Ops web facet 迁到 `webui/src/module/ops` | dashboard/capabilities/API/query/locale/style/test 模块自有 | 待确认 |
| UI-CLEAN-001 | ACCOUNT-WEB-001, OPS-WEB-001 | 清理宿主业务 UI/CSS | auth/ops/diagnostic/metrics 等专属 selector 和组件不在 platform/global | 待确认 |

### Checkpoint C：后端 bootstrap 与旧链删除

| ID | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| BOOT-RES-001 | ACCOUNT-WEB-002, OPS-WEB-001 | 复核 bootstrap DTO、版本和现有 Auth/Ops 兼容细节 | 新 R003 证据足以冻结 wire；若改 Session/CSRF/API 则重新确认 | 待确认 |
| BOOT-001 | BOOT-RES-001 | 实现 versioned bootstrap API | 只返回 module/principal/access/runtime 安全视图；权限 fail closed | 待确认 |
| MATCH-001 | BOOT-001 | 实现 frontend catalog/backend inventory 对齐 | absent/incompatible/degraded/protocol mismatch 状态和测试完整 | 待确认 |
| DELETE-001 | MATCH-001 | 删除 Go 前端 SourcePath Catalog/codegen | Entry/Route/Navigation/Locale SourcePath、generated registry 和旧 CLI 生成入口无残留 | 待确认 |
| DELETE-002 | DELETE-001 | 删除旧模块 Web 源码与兼容路径 | `internal/module/**/binding/webui/web`、re-export、alias 和失效测试/文档删除 | 待确认 |

### Checkpoint D：闭环验证

| ID | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| PROOF-001 | DELETE-002 | 用一个真实小切片证明新增模块无需改平台 | 只改 module facets + 两个 profiles；真实 API、权限、locale、style 可验证 | 待确认 |
| TEST-001 | PROOF-001 | 完成 Go/TS/React/architecture/E2E/visual/build 门禁 | requirements 验收矩阵全部有证据 | 待确认 |
| DOC-001 | TEST-001 | 同步 WebUI、应用模块、架构与启动 authority | 只描述已实现行为，047/048 历史关系明确 | 待确认 |
| GIT-001 | DOC-001 | 审查并提交单轨迁移 | 旧符号搜索 clean，只提交确认范围，不 push | 待确认 |

## 4. 后续独立业务变更

下列内容不属于 048 基础重构授权，必须分别研究、计划和确认：

| 候选变更 | 需要独立研究的内容 |
| --- | --- |
| 完整 Account 模块 | 用户、凭据、角色、权限、Session、安全策略、migration、操作审计和管理 API |
| Audit 模块 | 审计事件模型、不可变性、查询/导出、保留期、脱敏、权限和存储 |
| System Settings 模块 | 配置 owner、候选校验、reload/restart、secret 边界、变更预览和回滚 |
| Maintenance Tools | 每项高风险动作的 owner、operation、幂等、Execution Record、审计和取消语义 |

不能一次建立一个包含所有配置、脚本、诊断和运维动作的万能“工具集”模块。

## 5. 实施顺序

```text
A: ARC-001 -> ARC-002 -> ROUTER-001 -> STYLE-001 -> HOST-001
  -> B: ACCOUNT-WEB-001 -> ACCOUNT-WEB-002
        OPS-WEB-001 -> UI-CLEAN-001
  -> C: BOOT-RES-001 -> BOOT-001 -> MATCH-001 -> DELETE-001 -> DELETE-002
  -> D: PROOF-001 -> TEST-001 -> DOC-001 -> GIT-001
```

Checkpoint 不单独扩大授权。BOOT-RES-001 若发现需要改变 Session/CSRF/Origin、API path、数据库或依赖选择，任务返回研究并重新确认。

## 6. 验证矩阵

| 范围 | 计划检查 |
| --- | --- |
| Go | 受影响包测试、bootstrap contract、operation reference，最终 `go test ./...` |
| Frontend | lint、module boundary、typecheck、unit、build |
| Router | duplicate、layout、lazy、navigation、access 和 error boundary |
| Compatibility | module absent、extra、version mismatch、protocol mismatch、degraded |
| Architecture | 无 SourcePath、无 backend TS import、无 platform->module、无 cross-module、无 glob auto-registration |
| Security | Session/CSRF/Origin/CORS 不回归，bootstrap 低敏，服务端 gate 最终授权 |
| E2E | setup/login/logout/session、403、Ops 真实查询、模块不可用与不兼容 |
| Visual | 桌面/移动、明暗主题、Account/Ops 与 module state |
| Cleanup | 旧 Binding/codegen/目录/脚本/文档和业务全局 CSS 无残留 |
| Diff | `git diff --check`，逐文件审查，只提交确认范围 |

## 7. 重新确认触发器

- 远程模块、第三方插件或运行时安装卸载；
- 多身份提供方或公开 service registry；
- 改变 Session/CSRF/Origin、数据库 migration、API path 或 operation；
- 新 Router/UI/state/OpenAPI generator 依赖；
- 前端拆仓或独立模块发布；
- 新业务模块与 048 基础迁移合并实施；
- 任何需要宿主重新理解 Account/Audit/Ops/System 业务 DTO 的设计。
