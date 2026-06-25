# build 目录说明

`build` 记录构建、CI、Docker 和交付产物相关说明。这里面向开发者和维护者，不存放生成产物。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `docker-and-ci.md` | 说明 Dockerfile、Compose、CI workflow、WebUI 静态产物、容器 smoke 和 CI artifact 的当前行为。 |

## 维护规则

- 修改 Dockerfile、CI、发布包脚本或 WebUI 构建目录时，必须同步这里和发布文档。
- 当前机器无法运行 Docker 时，不得把容器构建或运行写成已通过；应引用 CI 或目标环境证据。
- 使用 CI artifact 作为 Docker 证据时，应通过 `scripts/check-ci-docker-evidence.ps1` 校验 workflow run、提交、artifact 和 `docker-smoke-ci.log` 内容。
- 构建文档只描述当前命令和产物路径，不恢复旧命令、旧前端入口或旧插件交付路径。

## 常用验证

```powershell
go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
```
