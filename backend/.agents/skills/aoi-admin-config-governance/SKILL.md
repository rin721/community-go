---
name: aoi-admin-config-governance
description: "Repository-specific workflow for changing configuration in this aoi-admin / open console platform repository. Use when adding, removing, renaming, validating, defaulting, documenting, or exposing runtime configuration fields, environment variables, config examples, system config snapshot metadata, setup schema fields, backend i18n labels, or config-related tests."
---

# Aoi Admin Config Governance

使用本 skill 处理当前仓库的配置治理任务。它补充根 `AGENTS.md` 和 `$aoi-admin-platform-maintenance`，不得覆盖或削弱它们。

## 先确认事实

1. 读取根 `AGENTS.md`、`docs/environment/configuration.md`、相关模块 README，以及待改配置所属的 Go 结构。
2. 用 `rg` 查真实入口和引用，不以文档作为唯一事实来源。
3. 区分配置类别：
   - 启动配置：`internal/config`、`configs/*.yaml`、`.env.example`。
   - 运行时配置：`internal/app/initapp/config_update.go`、`SystemConfigSnapshot`、System 配置页 metadata。
   - 首次安装配置：`internal/app/initcenter` schema、config store、validator。
   - 前端构建配置：`web/app` 的 Vite/env 类型、README 和 i18n。
4. 不修改 `configs/config.local.yaml`、`.env`、`data/`、`tmp/` 或其它本地派生文件，除非用户明确要求。

## 修改清单

新增或修改后端运行配置时，同步检查：

- `internal/config` 结构、默认值、`Validate`、值方法、深拷贝、环境变量 tag。
- `configs/config.example.yaml`。
- `configs/examples/*.example.yaml`。
- `deploy/config.production.example.yaml`。
- `.env.example`。
- `internal/config/config_examples_test.go` 的受控环境变量。
- `internal/config/manager_test.go` 的环境变量覆盖与深拷贝断言。
- `docs/environment/configuration.md` 和相关模块文档。

配置需要出现在后台系统配置页时，同步检查：

- `internal/app/initapp/modules.go` 的 `SystemConfigSnapshot`。
- `systemConfigGroups` 的分组、可见性、风险等级和 item 归属。
- `configs/locales/system/{zh-CN,en-US}.yaml` 的 section、group、item 标签。
- `internal/app/initapp/*_test.go` 的快照和分组测试。
- `internal/app/initapp/config_update.go` 是否支持该字段类型的运行时更新。

配置需要进入首次安装流程时，同步检查：

- `internal/app/initcenter/schema.go`。
- `internal/app/initcenter/config_store.go`。
- `internal/app/initcenter/validator.go`。
- `configs/locales/ui/{zh-CN,en-US}.yaml` 的 setup 文案。
- setup 相关 Go 测试和 React setup 页面能力。

## 规则

- 可变策略、品牌、部署差异、TTL、批量、调度、认证安全和资源路径进入配置，不写死在 service、handler、store 或页面中。
- 稳定协议值、HTTP 方法、数据库列名、迁移历史值和编译期 contract 标识可以留在代码里。
- 指针型可选配置必须有值方法、默认值、校验和深拷贝测试。
- 数值配置必须校验边界；无业务依据时至少拒绝非正数。
- 配置 API 不负责吞掉无效输入；底层解析错误向上返回，由 manager/service/handler 统一映射。
- 示例配置使用可复用中性默认值；根 README 中受控的 Aoi 项目代号语境不属于运行配置硬编码问题。

## 验证

按变更范围选择命令：

```powershell
go test ./internal/config -count=1 -mod=readonly
go test ./internal/app/initapp -count=1 -mod=readonly
go test ./internal/app/initcenter -count=1 -mod=readonly
go test ./internal/modules/system/... -count=1 -mod=readonly
go test ./... -count=1 -mod=readonly
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

涉及 WebUI 环境变量、可见文案或 setup 页面时追加：

```powershell
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
```

任务结束且有文件变更时，使用 `$git-conventional-commit` 收尾。
