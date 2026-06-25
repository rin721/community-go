---
name: aoi-admin-plugin-removal
description: "Repository-specific workflow for removing plugin-system leftovers and preventing plugin architecture regressions in this aoi-admin / open console platform repository. Use when deleting plugin code, auditing plugin remnants, migrating extension points to internal/modules, updating docs/config/API paths after plugin removal, or reviewing module-first expansion boundaries."
---

# Aoi Admin Plugin Removal

使用本 skill 处理插件系统移除、残留审计、防回潮和模块化迁移。当前架构不再以插件系统作为主要扩展方式；未来业务能力通过 `internal/modules` 显式新增和装配。

## 开始前

1. 读取根 `AGENTS.md`、`docs/extension/module-blueprint.md`、`docs/structure/directory-map.md`、`docs/maintenance/plugin-removal-convergence-audit-2026-06-23.md` 和相关模块 README。
2. 用 `rg` 搜索插件残留，至少覆盖代码、配置、docs、scripts、OpenAPI、前端 API client、路由、测试和发布脚本。
3. 区分真实交付文件、本地派生配置、历史证据文档和生成/忽略目录；不要把本地忽略文件当作当前架构事实。

## 禁止恢复的交付面

不得新增或恢复：

- `internal/plugin`
- `pkg/plugin`
- `pkg/pluginapi`
- `_examples/remote-plugins`
- `docs/api/plugin-protocol`
- `/api/v1/plugins`
- `/plugin-api`
- 前端插件管理页面、插件 API client 或插件路由
- 受控配置示例、部署示例或发布脚本中的 `plugins:` 配置块
- 插件协议兼容层、临时桥接层或隐藏 fallback

## 迁移原则

- 业务扩展进入 `internal/modules/<module>`，并按 `model`、`repository`、`service`、`handler` 边界组织。
- 模块必须显式接入 `internal/app/initapp`、route contract、权限、菜单、前端 API client、页面、i18n、测试和文档。
- 通用基础能力放入 `pkg` 或 `internal/app` 装配，不把业务扩展点伪装成插件 host。
- 删除插件残留时同步清理文档、配置示例、测试、构建脚本和发布说明，不保留失效兼容层。
- 如果用户要求“插件式扩展”，先指出与当前项目规则冲突，再给出模块化替代方案。

## 审计流程

1. 搜索插件关键词和路径：

```powershell
rg -n "plugin|plugins|plugin-api|remote-plugins|plugin-protocol|pkg/plugin|internal/plugin" -S .
```

2. 对命中项分类：
   - 当前禁止残留：必须迁移或删除。
   - 历史审计证据：可保留，但必须清楚标记为历史。
   - 用户本地配置或忽略目录：不作为交付事实，不要提交。
3. 若命中项代表仍需要的业务能力，迁移为模块能力并使用 `$aoi-admin-module-development`。
4. 若涉及 API、权限或 OpenAPI，同步使用 `$aoi-admin-api-contract-sync`。
5. 更新 README、维护指南、已知缺口和发布文档中的扩展说明。

## 验证

必须运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

涉及模块迁移时追加后端测试、OpenAPI 生成、前端类型检查和 i18n 检查。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
