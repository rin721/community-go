# frontend 子项目状态

`frontend/` 是受版本管理的 Nuxt 4/Vue 前端目录，但当前不属于根 Go 工程的集成构建和交付链。

## 当前事实

- 根 `.github/workflows`、Dockerfile、`.goreleaser.yaml` 和 `scripts/Verify-Quality.*` 不构建或发布本目录。
- 当前根工程没有 `backend/` 路径；因此旧文档中指向 `backend/internal/modules/community` 的集成说明不再是可验证入口。
- 旧文档曾引用 `scripts/check-frontend-community-boundary.ps1`、`scripts/check-frontend-community-api-smoke.ps1` 和 `scripts/check-frontend-community-page-smoke.ps1`，这些脚本当前不存在，不能作为验证命令。
- 本目录的 Nuxt 运行和社区 API 依赖没有形成当前 root Go backend 的可验证闭环。

## 使用边界

本目录可作为独立前端代码和历史产品资料保留，但当前项目不能把它描述为已接入的社区产品前端。若要重新集成，必须单独完成后端契约、启动方式、配置、CI、Docker/release、E2E 和文档影响评估；若要退役，也必须单独确认并保留可追溯的迁移证据。

`old-backend/` 不属于本状态页的审计范围，也不因本目录存在而获得当前 authority。
