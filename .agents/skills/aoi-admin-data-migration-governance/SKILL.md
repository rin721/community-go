---
name: aoi-admin-data-migration-governance
description: "Repository-specific workflow for database migrations, GORM models, repositories, seed data, demo data, dictionaries, system parameters, fixtures, and persistence compatibility in this aoi-admin / open console platform repository. Use when changing internal/migrations, module model/repository packages, setup/demo data, system dictionaries, version packages, migration docs, or database-related tests."
---

# Aoi Admin Data Migration Governance

使用本 skill 处理数据库结构、迁移、模型、仓储、初始化数据和演示数据。它服务模块化扩展和开源可运行性，要求数据层变化可迁移、可验证、可回滚说明清楚。

## 开始前

1. 阅读 `AGENTS.md`、`internal/migrations/README.md`、目标模块 README、`docs/environment/configuration.md`、`docs/onboarding/demo-environment.md` 和相关模块文档。
2. 用 `rg` 查迁移文件、GORM model、repository、service 接口、初始化流程、seed/demo fixture、字典、参数和版本包导入逻辑。
3. 判断变更属于 schema、索引、约束、数据回填、内置字典/参数、演示数据、安装向导初始数据还是测试 fixture。
4. 若新增业务 API、权限、WebUI 页面或配置项，同时使用模块开发、API 契约、WebUI/i18n 或配置治理 skill。

## 迁移规则

- 共享迁移一旦进入版本库即 append-only，不重写既有迁移。
- 新迁移文件命名保持时间戳顺序，SQL 兼容当前支持的数据库驱动；无法跨库统一时在文档中说明边界。
- 迁移必须与 GORM model、repository 查询、索引需求、唯一约束和软删除语义一致。
- 回填数据不得写入私有品牌、私有组织或不可复用默认值；产品、品牌和部署差异通过配置或 system 参数表达。
- 涉及权限、菜单、API catalog、字典或版本包时，确认 route contract、System 模块和导入/同步逻辑一致。
- 初始化和演示数据不得包含真实密钥、生产凭证或不可公开 token；测试 fixture 与本地 demo 数据要有明确边界。

## 分层边界

- model 描述领域数据和持久化结构，不承载业务用例编排。
- service 定义本模块需要的最小 repository 接口，并处理事务、权限语义和领域规则。
- repository/infrastructure 隔离 ORM、SQL、事务 executor 和数据库差异。
- `pkg` 数据库、迁移器或存储辅助不得导入业务模块。
- 全局 `types` 不承载模块私有 DTO、缓存 key、迁移常量或数据库枚举。

## 修改顺序

1. 先从现有模型和查询反推真实 schema 需求。
2. 新增迁移、模型字段、repository 查询和 service 规则。
3. 更新初始化、演示数据、字典、参数或版本包导入逻辑。
4. 补迁移、repository、service 或 HTTP 测试。
5. 同步模块 README、配置文档、演示环境文档、发布/迁移说明和已知缺口。

## 验证

按影响范围选择：

```powershell
go test ./internal/migrations -count=1 -mod=readonly
go test ./internal/modules/<module>/... -count=1 -mod=readonly
go test ./internal/app/... -count=1 -mod=readonly
go test ./... -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
git diff --check
```

触及 demo、发布或 Docker 数据路径时，补充对应 release、runtime smoke 或 Docker smoke 证据。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
