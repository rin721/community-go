---
name: banyao-community-fullstack
description: "Repository-specific workflow for banyao-web community frontend/backend integration, kirakira-inspired design distillation, setup-aware real API wiring, mock boundary documentation, task tree updates, and focused validation."
---

# Banyao Community Fullstack

使用本 skill 推进 `banyao-web` 聚合仓库的视频社区体验、前后端真实数据接入、Mock 边界、视觉 QA 和任务树同步。它补充根 `AGENTS.md`，不得替代根规则。

## 开始前

1. 阅读根 `AGENTS.md`、`TASK_TREE.md`、`frontend/README.md`、`backend/internal/modules/community/README.md`、`backend/docs/modules/community.md`、`backend/docs/api/http-api.md`。
2. 用 `git status --branch --short`、`git diff --stat` 和 `rg` 确认当前改动、接口、页面、mock、i18n 与验证脚本。
3. 若任务涉及 API、OpenAPI、模块、文档、视觉 QA，继续使用对应专项 skill：`aoi-admin-api-contract-sync`、`aoi-admin-module-development`、`aoi-admin-docs-governance`、`aoi-admin-task-planning`、`frontend-implementation`、`soft-modular-product-ui`。

## 设计融合规则

- kirakira.moe 只作为设计语言参考：浅色页面、粉色强调、轻导航、公告条、双端媒体网格、紧凑元信息、短促微动效。
- 不复制 kirakira 的品牌标识、专有文案、图片、固定布局或真实数据。
- 前端实现必须继续使用 `frontend/app/assets/css/tokens.css`、`frontend/app/assets/css/main.css`、Aoi wrapper、`AoiLink`、`AoiButton`、`AoiIconButton`。
- 可见 UI 修改后至少检查 1440x900 与 390x844，无法检查时在任务树和最终输出说明原因。
- 真实后端少量内容是常态；首页、搜索、创作者页和关注流在 1-2 条真实视频时必须保持稳定媒体比例、可读卡片宽度和移动端单列/双列节奏，不得只按 mock 满屏数据调样式。

## 数据接入规则

- 后端社区生产能力以 `backend/internal/transport/http/contracts.go`、真实路由和 `backend/internal/modules/community` 为事实来源。
- 发现后端社区 HTTP 接口存在硬编码数据、静态返回或伪造业务状态时，必须补齐 `backend/internal/modules/community` 内的 model、repository、service、handler 和真实持久化链路，并同步 route contract；不得在后端真实接口继续新增 Mock 分支或把 fixture 混入联调路径。
- 视频分类生产来源是系统字典 `community.video.category`：字典 item 的 `value` 是分类 slug，`label` 是展示名，`sort` 是排序，`extra` JSON 可保存 `parentSlug`、`description`、`accentColor`。后端不得维护平行分类种子表或在真实接口硬编码分类；前端不得在真实模式写死 `design`、`home` 或其他生产分类默认值。
- `GET /api/v1/public/community/status` 是前端判断真实 API、setup 状态和端点清单的入口。
- 平台初始化未完成时，内容 API、社区账号 API 和账号路径应返回 503 result envelope，`messageKey=api.setup.required`，`data` 为 `CommunitySetupStatus`。
- Nuxt mock 必须清楚标记为演示/调试能力；mock `/api/mock/status` 应返回 `mode=mock` 与 setup 已完成状态，避免伪装成真实联调。mock 数据只允许放在 `frontend/server/api/mock/**` 与 `frontend/shared/mocks/**`，业务页面、store 和普通 composable 不得导入 mock fixture 或直接访问 `/api/mock`；真实模式只允许 API client 根据 `NUXT_PUBLIC_API_MOCK=true` 切入 mock。
- 前端真实请求只通过 `useAoiApi()`、`useAoiAuthApi()` 与共享 DTO，不在页面散落 `/api/v1` 字符串。
- 评论、动态、关注、收藏、历史、通知、投稿等用户范围数据必须以匿名或账号 `clientId` 为归属边界；评论和动态编辑 / 删除只能消费后端返回的 `ownedByCurrentClient`，不得通过作者名、列表位置或本地缓存推断权限。
- 投稿审核入口位于主系统 `GET /api/v1/community/submissions` 与 `PATCH /api/v1/community/submissions/:submissionId/review`，必须走 route contract、OpenAPI、IAM 权限 `community_submission:review` 和 `backend/internal/modules/community` service 规则；`published` 可绑定既有 `publishedVideoId`，也可在请求携带受控 `mediaAssetId` 与 `durationSeconds` 时从 system media 资产生成社区视频记录，`sourceUrl` 仅作为过渡路径保留。不得把社区用户侧真实上传、转码或后台可视化审核页伪装成已完成。

## 文档与任务树

- 每个阶段开始前更新 `TASK_TREE.md` 的阶段、影响范围、计划节点和 Mark 状态。
- 文档只描述当前已实现行为；未完成能力写在任务树后续分支或 backlog，不写成已完成。
- 同步至少覆盖：`frontend/README.md`、`backend/internal/modules/community/README.md`、`backend/docs/modules/community.md`、`backend/docs/api/http-api.md`，以及必要的 OpenAPI 生成产物。

## 验证

按变更范围选择：

```powershell
Push-Location backend
go test ./internal/modules/community/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
Pop-Location
pnpm --dir frontend typecheck
powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-boundary.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-page-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
git diff --check
```

涉及评论编辑 / 删除、动态编辑 / 删除、互动写入、投稿审核、媒体资产关联、账号范围接口或视频分类来源时，`scripts/check-frontend-community-api-smoke.ps1` 需覆盖真实后端创建、查询、更新、删除、system media 上传、审核状态流转、发布关联路径或通过系统字典 API 创建测试分类，不能只验证静态列表。

运行失败时，先记录确切失败命令和错误，再修正或在最终输出说明未验证风险。
