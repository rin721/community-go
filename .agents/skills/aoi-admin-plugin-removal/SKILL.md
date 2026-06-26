---
name: aoi-admin-plugin-removal
description: "Repository-specific workflow for governing extension boundaries in this aoi-admin / open console platform repository. Use when reviewing module-first expansion boundaries, extension paths, docs/config/API delivery surfaces, or checks that keep business capabilities aligned with internal/modules."
---

# Aoi Admin Extension Boundary Governance

使用本 skill 处理模块化扩展边界、交付面审计和模块化接入治理。当前业务能力通过 `internal/modules` 显式新增和装配。

## 开始前

1. 读取根 `AGENTS.md`、`docs/extension/module-blueprint.md`、`docs/structure/directory-map.md` 和相关模块 README。
2. 用 `rg` 搜索扩展边界关键词，至少覆盖代码、配置、docs、scripts、OpenAPI、前端 API client、路由、测试和发布脚本。
3. 区分真实交付文件、本地派生配置、阶段证据文档和生成/忽略目录；不要把本地忽略文件当作当前架构事实。

## 当前交付面

模块化扩展应落在：

- `internal/modules`
- `internal/app/initapp`
- `internal/transport/http/contracts.go`
- API catalog、权限同步和 OpenAPI
- 前端 API client、页面、i18n 和测试
- 受控配置示例、部署示例和发布脚本中的当前配置项

## 治理原则

- 新业务能力进入 `internal/modules/<module>`，并按 `model`、`repository`、`service`、`handler` 边界组织。
- 模块必须显式接入 `internal/app/initapp`、route contract、权限、菜单、前端 API client、页面、i18n、测试和文档。
- 通用基础能力放入 `pkg` 或 `internal/app` 装配，不把业务扩展点做成并行运行时。
- 调整扩展边界时同步更新文档、配置示例、测试、构建脚本和发布说明。
- 如果用户要求动态扩展形态，先指出与当前模块化路线的边界差异，再给出模块化替代方案。

## 审计流程

1. 搜索扩展边界关键词和路径：

```powershell
rg -n "plugin|plugins|plugin-api|remote-plugins|plugin-protocol|pkg/plugin|internal/plugin" -S .
```

2. 对命中项分类：
   - 技术术语或第三方包名是否只是普通依赖语境。
   - 阶段证据文档是否需要保留时间语境。
   - 生产交付面、配置示例、OpenAPI、前端路由和脚本是否需要修改。
3. 若命中项代表仍需要的业务能力，将其收敛为模块能力并使用 `$aoi-admin-module-development`。
4. 若涉及 API、权限或 OpenAPI，同步使用 `$aoi-admin-api-contract-sync`。
5. 更新 README、维护指南、已知缺口和发布文档中的扩展说明。

## 验证

必须运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

涉及模块边界调整时追加后端测试、OpenAPI 生成、前端类型检查和 i18n 检查。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
