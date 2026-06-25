# 发布包 SQLite/CGO 边界审计：2026-06-23

本文记录 `scripts/check-package-sqlite-boundary.ps1` 的新增依据、检查边界和本地验证结果。它用于防止发布包脚本的 SQLite/CGO 提示、包内 README 和 manifest 字段漂移，但不替代目标平台真实运行烟测。

## 当前事实

- `scripts/package.py` 默认以 `CGO_ENABLED=0` 构建发布包，便于交叉编译。
- Go 的 SQLite 驱动依赖 CGO；默认发布包的 SQLite 运行态不可用。
- `scripts/package.py --dry-run` 已输出 `CGO_ENABLED` 和 `SQLite runtime` 状态。
- 包内 `README.txt` 已写入 `CGO_ENABLED`、`SQLite runtime` 和默认 CGO=0 的数据库选择提示。
- 包内 `manifest.json` 已写入 `cgoEnabled` 和 `sqliteRuntimeAvailable`。

## 发现的问题

发布包数据库边界已经在实现中存在，但此前没有独立 gate 检查它是否持续存在。后续修改 `scripts/package.py`、发布包 README 或 manifest 时，可能出现以下漂移：

- 默认 `CGO_ENABLED=0` 不再提示 SQLite 不可用。
- `--cgo` dry-run 不再提示 SQLite 可用。
- 包内 `README.txt` 与 dry-run 输出不一致。
- `manifest.json` 不再记录 `sqliteRuntimeAvailable`。
- 文档误把 dry-run/元数据证明写成跨目标平台 SQLite 运行证明。

## 变更内容

新增 `scripts/check-package-sqlite-boundary.ps1`：

- 执行 `python scripts/package.py --dry-run --target linux/amd64 --version sqlite-boundary --skip-web-build`。
- 执行同一 dry-run 并追加 `--cgo`。
- 检查默认 CGO=0 输出包含 `SQLite runtime: unavailable`、`use MySQL/Postgres` 和 `--cgo` 提示。
- 检查 `--cgo` 输出包含 `CGO_ENABLED: 1` 与 `SQLite runtime: available`。
- 检查 `scripts/package.py` 中仍写入 `CGO_DISABLED_SQLITE_NOTE`、`cgoEnabled`、`sqliteRuntimeAvailable` 和包内 README 的 CGO/SQLite 行。

## 接入位置

- 默认 `scripts/release-preflight.ps1` 已执行该检查。
- `scripts/check-open-source-readiness.ps1` 已检查脚本存在、preflight 接入和文档入口。
- 根 `AGENTS.md`、仓库级 release/build/platform skill、`scripts/README.md`、测试矩阵、Docker/CI 文档、发布 checklist 和发布证据模板已同步该命令。
- `docs/backlog/known-gaps.md` 继续保留跨目标平台 CGO/SQLite 发布包 smoke 缺口。

## 验证结果

已执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
```

结果：

```text
package SQLite boundary check passed.
dry-run variants checked: 2
```

该检查只执行 dry-run，不写入 `build/releases`，也不构建真实发布包。

## 剩余边界

- 默认发布包仍应优先使用 PostgreSQL 或 MySQL。
- 确需 SQLite 时，必须在目标平台或具备对应 C 工具链的环境使用 `python scripts/package.py --cgo ...` 构建。
- 正式发布前仍需在目标环境补充 `--cgo` 发布包运行烟测，至少覆盖 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`。
