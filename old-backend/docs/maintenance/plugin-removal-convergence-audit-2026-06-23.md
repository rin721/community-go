# 插件系统移除收敛审计：2026-06-23

本文记录第二组“插件系统移除”的当前事实、机器化检查和剩余风险。它用于拆分 PR 或发布前核验，不替代完整启动、Docker 运行和生产发布证据。

## 当前事实

以当前工作树为准：

- `internal/plugin`、`pkg/plugin`、`pkg/pluginapi`、`_examples/remote-plugins` 不存在。
- `docs/api/plugin-protocol`、`docs/architecture/distributed-plugin-system.md`、`docs/modules/plugins.md` 不存在。
- 插件配置示例 `configs/examples/plugins-remote-rpc.example.yaml` 不存在。
- 插件管理前端入口 `web/app/app/lib/api/plugins.ts` 和 `web/app/app/routes/admin/plugins.tsx` 不存在。
- 未来扩展入口已收敛到 `internal/modules` 和 `docs/extension/module-blueprint.md`。

## 新增检查

新增 `scripts/check-plugin-removal.ps1`，它只读检查以下内容：

- 已删除插件运行时、协议、迁移、配置示例、文档和前端入口路径。
- 模块化替代路径存在，例如 `internal/modules`、`docs/extension/adding-modules.md`、`docs/extension/module-blueprint.md`。
- 受控配置示例不再包含 `plugins:`、`/plugin-api`、`/api/v1/plugins` 等插件配置。
- 生产交付面不再包含插件运行时路径、插件协议路径或插件 API 路径。
- README、测试和维护文档中允许保留“不得恢复插件系统”的防回潮说明。

单独运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
```

该脚本已接入 `scripts/release-preflight.ps1` 默认 gate，也被 `scripts/check-open-source-readiness.ps1` 纳入必查路径。

## 架构影响

本阶段没有新增运行时抽象。新增脚本把插件系统删除边界从人工搜索变成可重复检查：

- 业务扩展只走模块化路线。
- 受控配置、部署、前端 API 和生产 Go 代码不得恢复插件交付面。
- 防回潮规则可以保留在 README、测试和维护文档中，但不能重新变成运行时兼容层。

## 验证结果

本轮已执行并通过；生产交付面文件数量会随文档、脚本和前端源码增减变化，发布前应以现场输出为准：

```text
plugin removal check passed.
removed paths checked: 15
replacement paths checked: 6
config files scanned: 9
production files scanned: 447
```

补充验证：

- `scripts/check-open-source-readiness.ps1` 通过，已把插件移除脚本纳入关键路径。
- `scripts/release-preflight.ps1` 默认 gate 已接入 `plugin removal` 步骤。

## 剩余风险

- 本地已形成干净提交边界；插件移除仍可作为对外审查或 PR 拆分时的第二组说明，不表示 Docker 或生产发布证据已经完成。
- `configs/config.local.yaml` 是 `.gitignore` 明确忽略的本地派生配置，可能保留旧插件配置片段；它不作为交付事实，本阶段未修改。
- 生产部署仍需目标环境或 CI 证明，不能仅凭静态删除检查宣称容器运行已完成。

## 审计结论

插件系统移除方向与模块化扩展目标一致。后续若单独拆第二组 PR，应保留本脚本、模块化扩展文档、插件路径删除项和前端插件入口删除项在同一审查范围内，并在干净分支复跑 `scripts/check-plugin-removal.ps1` 与相关 Go/前端验证。
